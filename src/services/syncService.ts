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

  private async push(): Promise<void> {
    const pending = await getPending();
    for (const op of pending) {
      try {
        await apiFetch(op.endpoint, { method: op.method, body: op.payload });
        await markSynced(op.id);
        const pk = ENTITY_PK_MAP[op.entity];
        const localId = JSON.parse(op.payload)[pk] ?? JSON.parse(op.payload).id;
        if (localId) {
          await execute(`UPDATE ${op.entity} SET _synced = 1 WHERE ${pk} = ? OR id = ?`, [localId, localId]);
        }
      } catch {
        await incrementRetry(op.id);
      }
    }
  }

  private async pullEntity(entity: string, propriedadeId: string): Promise<void> {
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
