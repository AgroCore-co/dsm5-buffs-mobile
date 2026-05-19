import { getDb } from './db';
import { CREATE_TABLES_SQL } from './schema';

const CURRENT_VERSION = 1;

export async function runMigrations(): Promise<void> {
  const db = getDb();

  const versionResult = await db.execute('PRAGMA user_version');
  const currentVersion = (versionResult.rows[0] as any)?.user_version ?? 0;

  if (currentVersion >= CURRENT_VERSION) {
    return;
  }

  for (const sql of CREATE_TABLES_SQL) {
    await db.execute(sql);
  }

  await db.execute(`PRAGMA user_version = ${CURRENT_VERSION}`);
}
