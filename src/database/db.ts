import { open } from '@op-engineering/op-sqlite';

let _db: ReturnType<typeof open> | null = null;

export function getDb() {
  if (!_db) {
    _db = open({ name: 'buffs.db' });
  }
  return _db;
}

export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = getDb();
  const result = await db.execute(sql, params);
  return (result.rows ?? []) as T[];
}

export async function queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryAll<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  const db = getDb();
  await db.execute(sql, params);
}

export async function isFirstSync(propriedadeId: string): Promise<boolean> {
  const row = await queryFirst<{ lastSyncedAt: string | null }>(
    `SELECT lastSyncedAt FROM sync_meta WHERE entity = 'bufalos' AND propriedadeId = ?`,
    [propriedadeId],
  );
  return row === null || row.lastSyncedAt === null;
}
