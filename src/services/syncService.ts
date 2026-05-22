import NetInfo from '@react-native-community/netinfo';
import { apiFetch } from '../lib/apiClient';
import { execute, queryFirst } from '../database/db';
import { ENTITY_PK_MAP, ENTITY_API_PK_MAP, SYNC_ENTITY_PATH, getEntityExtras } from '../database/schema';
import { getPending, markSynced, incrementRetry } from './pendingOperationsService';

async function isConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable);
}

async function upsertBatch(entity: string, records: any[]): Promise<void> {
  const pk = ENTITY_PK_MAP[entity];

  for (const record of records) {
    const deletedAt = record.deletedAt ?? record.deleted_at ?? null;
    const updatedAt = record.updatedAt ?? record.updated_at ?? new Date().toISOString();

    if (deletedAt) {
      await execute(
        `UPDATE ${entity} SET deletedAt = ?, updatedAt = ? WHERE ${pk} = ?`,
        [deletedAt, updatedAt, record[pk]]
      );
      continue;
    }

    const extras = getEntityExtras(entity, record);
    const colNames = [pk, 'updatedAt', 'deletedAt', '_synced', '_raw', ...Object.keys(extras)];
    const colVals = [
      record[pk],
      updatedAt,
      null,
      1,
      JSON.stringify(record),
      ...Object.values(extras),
    ];
    const placeholders = colVals.map(() => '?').join(', ');
    const updateSet = [
      'updatedAt = excluded.updatedAt',
      '_raw = excluded._raw',
      '_synced = 1',
      ...Object.keys(extras).map(k => `${k} = excluded.${k}`),
    ].join(', ');

    await execute(
      `INSERT INTO ${entity} (${colNames.join(', ')}) VALUES (${placeholders})
       ON CONFLICT(${pk}) DO UPDATE SET ${updateSet}
       WHERE _synced = 1 OR excluded.updatedAt > ${entity}.updatedAt`,
      colVals
    );
  }
}

const CORE_ENTITIES = ['bufalos', 'ciclos_lactacao', 'reproducoes'];

class SyncService {
  private running = false;

  async sync(propriedadeId: string): Promise<void> {
    if (this.running || !(await isConnected())) return;
    this.running = true;
    try {
      await this.push();
      await this.pull(propriedadeId);
    } finally {
      this.running = false;
    }
  }

  // Syncs somente entidades core (bufalos, ciclos_lactacao, reproducoes) + push.
  // Usado na tela de sync inicial para liberar o app rapidamente.
  async syncCore(
    propriedadeId: string,
    onProgress?: (done: number, total: number) => void,
  ): Promise<void> {
    if (this.running || !(await isConnected())) return;
    this.running = true;
    try {
      await this.push();
      const total = CORE_ENTITIES.length;
      for (let i = 0; i < total; i++) {
        await this.pullEntity(CORE_ENTITIES[i], propriedadeId);
        onProgress?.(i + 1, total);
      }
    } finally {
      this.running = false;
    }
  }

  private async push(): Promise<void> {
    const pending = await getPending();
    for (const op of pending) {
      try {
        await apiFetch(op.endpoint, { method: op.method, body: op.payload });
        await markSynced(op.id);
        const pk = ENTITY_PK_MAP[op.entity];
        if (pk) {
          const localId = JSON.parse(op.payload)[pk] ?? JSON.parse(op.payload).id;
          if (localId) {
            await execute(`UPDATE ${op.entity} SET _synced = 1 WHERE ${pk} = ? OR id = ?`, [localId, localId]);
          }
        }
      } catch (err: any) {
        const errMsg = err?.message ?? String(err);
        console.error(
          `[sync] push falhou — entity: ${op.entity}, op: ${op.operation}, endpoint: ${op.endpoint}\n` +
          `Payload: ${op.payload}\nErro: ${errMsg}`
        );
        await incrementRetry(op.id, errMsg);
        // CREATE failure may leave dependent ops (CREATE B, UPDATE A) without a server-side id.
        // Stop the queue so order is preserved on the next retry.
        if (op.operation === 'CREATE') break;
      }
    }
  }

  private async pullIndustrias(propriedadeId: string): Promise<void> {
    try {
      const records: any[] = await apiFetch(`/laticinios/propriedade/${propriedadeId}`);
      if (!Array.isArray(records) || records.length === 0) return;
      const normalized = records.map((r: any) => ({
        ...r,
        id: r.id_industria ?? r.idIndustria ?? r.id,
        propriedadeId,
        updatedAt: new Date().toISOString(),
      }));
      await upsertBatch('industrias', normalized);
    } catch (err) {
      console.warn('[sync] pullIndustrias falhou:', err);
    }
  }

  private async pullMaterialGenetico(propriedadeId: string): Promise<void> {
    const PAGE_SIZE = 200;
    try {
      let page = 1;
      let totalPages = 1;
      do {
        const response: any = await apiFetch(
          `/sync/${propriedadeId}/material-genetico?page=${page}&limit=${PAGE_SIZE}`
        );
        const records: any[] = Array.isArray(response) ? response : response.data ?? [];
        totalPages = response?.meta?.totalPages ?? 1;
        if (!records.length) break;
        const now = new Date().toISOString();
        const normalized = records.map((r: any) => ({
          ...r,
          id: r.id ?? r.idMaterial ?? null,
          propriedadeId,
          updatedAt: r.updatedAt ?? now,
        }));
        if (__DEV__) {
          console.log(
            `[sync] pullMaterialGenetico p${page}/${totalPages}: ${records.length} registros. ` +
            `Sample: id="${normalized[0]?.id?.slice(0, 8)}", tipo="${normalized[0]?.tipo}", prop="${normalized[0]?.propriedadeId?.slice(0, 8)}"`
          );
        }
        await upsertBatch('material_genetico', normalized);
        page++;
      } while (page <= totalPages);
    } catch (err) {
      console.warn('[sync] pullMaterialGenetico falhou:', err);
    }
  }

  private async pullEntity(entity: string, propriedadeId: string): Promise<void> {
    if (entity === 'industrias') {
      return this.pullIndustrias(propriedadeId);
    }
    if (entity === 'material_genetico') {
      return this.pullMaterialGenetico(propriedadeId);
    }
    try {
      const syncPropId = entity === 'racas' ? 'global' : propriedadeId;
      const meta = await queryFirst<{ lastSyncedAt: string | null }>(
        'SELECT lastSyncedAt FROM sync_meta WHERE entity = ? AND propriedadeId = ?',
        [entity, syncPropId]
      );

      const path = SYNC_ENTITY_PATH[entity];
      const qs = new URLSearchParams();
      if (entity !== 'racas') {
        qs.append('propriedadeId', propriedadeId);
      }
      if (meta?.lastSyncedAt) qs.append('updated_at', meta.lastSyncedAt);

      const response = await apiFetch(`/sync/${path}?${qs.toString()}`);

      const data = Array.isArray(response) ? response : response.data || [];
      const syncedAt = response.synced_at || response.meta?.synced_at || new Date().toISOString();

      // Garante que cada registro tem campo 'id', mesmo que a API retorne só o PK original
      const apiPk = ENTITY_API_PK_MAP[entity];
      const normalizedData = data.map((record: any) => ({
        ...record,
        id: record.id ?? (apiPk ? record[apiPk] : null),
      }));

      await upsertBatch(entity, normalizedData);

      await execute(
        `INSERT OR REPLACE INTO sync_meta (entity, propriedadeId, lastSyncedAt) VALUES (?, ?, ?)`,
        [entity, syncPropId, syncedAt]
      );
    } catch (err) {
      console.warn(`[sync] pullEntity falhou para "${entity}":`, err);
    }
  }

  private async pull(propriedadeId: string): Promise<void> {
    const entities = Object.keys(ENTITY_PK_MAP);
    await Promise.allSettled(entities.map(e => this.pullEntity(e, propriedadeId)));
  }
}

export const syncService = new SyncService();
