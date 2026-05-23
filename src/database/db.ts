import { open, type DB } from '@op-engineering/op-sqlite';

let _db: DB | null = null;

function getDb(): DB {
  if (!_db) {
    _db = open({ name: 'buffs.sqlite' });
  }
  return _db;
}

export async function queryAll<T>(sql: string, params?: any[]): Promise<T[]> {
  const result = params ? await getDb().execute(sql, params) : await getDb().execute(sql);
  const rows = Array.isArray(result.rows) ? result.rows : (result.rows as any)?._array ?? [];
  return rows as T[];
}

export async function queryFirst<T>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await queryAll<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params?: any[]): Promise<void> {
  if (params) {
    await getDb().execute(sql, params);
  } else {
    await getDb().execute(sql);
  }
}

export async function isFirstSync(propriedadeId?: string): Promise<boolean> {
  if (propriedadeId) {
    const row = await queryFirst<{ lastSyncedAt: string | null }>(
      'SELECT lastSyncedAt FROM sync_meta WHERE propriedadeId = ? LIMIT 1',
      [propriedadeId]
    );
    return !row || row.lastSyncedAt === null;
  }
  const row = await queryFirst<{ lastSyncedAt: string | null }>(
    'SELECT lastSyncedAt FROM sync_meta LIMIT 1'
  );
  return !row || row.lastSyncedAt === null;
}
