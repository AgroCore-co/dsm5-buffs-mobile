import { CREATE_TABLES_SQL } from './schema';
import { execute, queryFirst } from './db';

const CURRENT_VERSION = 1;

export async function runMigrations(): Promise<void> {
  const row = await queryFirst<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < CURRENT_VERSION) {
    // Executa cada statement separadamente (op-sqlite não aceita múltiplos em uma só chamada)
    const statements = CREATE_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(Boolean);

    for (const sql of statements) {
      await execute(sql);
    }

    await execute(`PRAGMA user_version = ${CURRENT_VERSION}`);
  }
}
