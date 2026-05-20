import { CREATE_TABLES_SQL } from './schema';
import { execute, queryFirst } from './db';

const CURRENT_VERSION = 3;

const LEGACY_TABLES = [
  'bufalos', 'ciclos_lactacao', 'grupos', 'racas',
  'dados_zootecnicos', 'pesagens', 'medicamentos',
  'dados_sanitarios', 'eventos_sanitarios', 'alertas',
  'coberturas', 'reproducoes', 'material_genetico',
  'sync_meta', 'pending_operations',
];

export async function runMigrations(): Promise<void> {
  const row = await queryFirst<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version >= CURRENT_VERSION) return;

  if (version >= 1) {
    // v1/v2 had wrong table/column names — drop everything and recreate
    for (const table of LEGACY_TABLES) {
      await execute(`DROP TABLE IF EXISTS ${table}`);
    }
  }

  for (const sql of CREATE_TABLES_SQL) {
    await execute(sql);
  }
  await execute(`PRAGMA user_version = ${CURRENT_VERSION}`);
}
