import { apiFetch } from '../lib/apiClient';
import { queryAll, execute } from '../database/db';
import { ENTITY_PK_MAP, SYNC_ENTITY_PATH, getEntityExtras } from '../database/schema';
import {
  getPending,
  markSynced,
  incrementRetry,
} from './pendingOperationsService';

type SyncableEntity = keyof typeof ENTITY_PK_MAP;

let _syncing = false;

export async function upsertBatch(entity: string, rows: any[]): Promise<void> {
  if (rows.length === 0) return;

  const pk = ENTITY_PK_MAP[entity];
  const extras = getEntityExtras(entity);
  const extraCols = extras.columns.join(', ');
  const extraPlaceholders = extras.columns.map(() => '?').join(', ');

  for (const row of rows) {
    const extraVals = extras.values(row);
    await execute(
      `INSERT OR REPLACE INTO ${entity} (${pk}, ${extraCols}, _raw, _synced)
       VALUES (?, ${extraPlaceholders}, ?, 1)`,
      [row[pk], ...extraVals, JSON.stringify(row)],
    );
  }
}

export async function pullEntity(
  entity: SyncableEntity,
  propriedadeId: string,
): Promise<void> {
  const path = SYNC_ENTITY_PATH[entity];
  const isGlobal = entity === 'racas' || entity === 'medicamentos';

  const metaRow = await queryAll<{ lastSyncedAt: string | null }>(
    `SELECT lastSyncedAt FROM sync_meta WHERE entity = ? AND propriedadeId = ?`,
    [entity, isGlobal ? 'global' : propriedadeId],
  );
  const lastSyncedAt = metaRow[0]?.lastSyncedAt ?? null;

  const params = new URLSearchParams();
  if (!isGlobal) params.append('propriedadeId', propriedadeId);
  if (lastSyncedAt) params.append('updated_at', lastSyncedAt);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await apiFetch(`/sync/${path}${query}`);
  const rows: any[] = Array.isArray(response) ? response : response.data ?? [];

  const toUpsert = rows.filter((r) => !r.deletedAt);
  const toDelete = rows.filter((r) => r.deletedAt);
  const pk = ENTITY_PK_MAP[entity];

  await upsertBatch(entity, toUpsert);

  for (const row of toDelete) {
    const localRow = await queryAll(
      `SELECT _synced FROM ${entity} WHERE ${pk} = ?`,
      [row[pk]],
    );
    if (localRow.length === 0 || (localRow[0] as any)._synced === 1) {
      await execute(`DELETE FROM ${entity} WHERE ${pk} = ?`, [row[pk]]);
    }
  }

  const now = new Date().toISOString();
  await execute(
    `INSERT OR REPLACE INTO sync_meta (entity, propriedadeId, lastSyncedAt) VALUES (?, ?, ?)`,
    [entity, isGlobal ? 'global' : propriedadeId, now],
  );
}

export async function pull(propriedadeId: string): Promise<void> {
  const entities = Object.keys(ENTITY_PK_MAP) as SyncableEntity[];
  for (const entity of entities) {
    await pullEntity(entity, propriedadeId);
  }
}

export async function push(): Promise<void> {
  const pending = await getPending();

  for (const op of pending) {
    try {
      const payload = JSON.parse(op.payload);
      const pk = ENTITY_PK_MAP[op.entity];
      const path = SYNC_ENTITY_PATH[op.entity];

      if (op.operation === 'CREATE') {
        await apiFetch(`/${path}`, { method: 'POST', body: payload });
      } else if (op.operation === 'UPDATE') {
        await apiFetch(`/${path}/${payload[pk]}`, { method: 'PATCH', body: payload });
      } else if (op.operation === 'DELETE') {
        await apiFetch(`/${path}/${payload[pk]}`, { method: 'DELETE' });
      }

      await markSynced(op.id);
    } catch {
      await incrementRetry(op.id);
    }
  }
}

export async function sync(propriedadeId: string): Promise<void> {
  if (_syncing) return;
  _syncing = true;
  try {
    await push();
    await pull(propriedadeId);
  } finally {
    _syncing = false;
  }
}
