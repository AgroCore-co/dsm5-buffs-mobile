import { open, type DB } from '@op-engineering/op-sqlite';

let _db: DB | null = null;

function getDb(): DB {
  if (!_db) {
    _db = open({ name: 'buffs.sqlite' });
  }
  return _db;
}

export async function queryAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  const result = await getDb().executeAsync(sql, params);
  const arr = Array.isArray(result.rows) ? result.rows : (result.rows as any)?._array ?? [];
  return arr as T[];
}

export async function queryFirst<T>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryAll<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  await getDb().executeAsync(sql, params);
}

export async function isFirstSync(propriedadeId?: string): Promise<boolean> {
  if (propriedadeId) {
    const row = await queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_meta WHERE propriedadeId = ?',
      [propriedadeId]
    );
    return (row?.count ?? 0) === 0;
  }
  const row = await queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM sync_meta');
  return (row?.count ?? 0) === 0;
}
