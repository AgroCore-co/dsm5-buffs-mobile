import { CREATE_TABLES_SQL } from './schema';
import { execute, queryFirst } from './db';

const CURRENT_VERSION = 10;

const LEGACY_TABLES = [
  'bufalos', 'ciclos_lactacao', 'grupos', 'racas',
  'dados_zootecnicos', 'pesagens', 'medicamentos',
  'dados_sanitarios', 'eventos_sanitarios', 'alertas',
  'coberturas', 'reproducoes', 'material_genetico',
  'lotes', 'ordenhas', 'sync_meta', 'pending_operations',
  'producao_diaria', 'mov_lote',
];

export async function runMigrations(): Promise<void> {
  const row = await queryFirst<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version >= CURRENT_VERSION) return;

  if (version === 0) {
    // Instalação limpa: recria tudo do zero
    for (const table of LEGACY_TABLES) {
      await execute(`DROP TABLE IF EXISTS ${table}`);
    }
    for (const sql of CREATE_TABLES_SQL) {
      await execute(sql);
    }
  } else {
    // Migrações incrementais — nunca dropam tabelas com dados
    if (version < 10) {
      await execute(`CREATE TABLE IF NOT EXISTS mov_lote (
        id            TEXT PRIMARY KEY,
        propriedadeId TEXT,
        idGrupo       TEXT,
        idLoteAtual   TEXT,
        dtEntrada     TEXT,
        updatedAt     TEXT NOT NULL,
        deletedAt     TEXT,
        _synced       INTEGER NOT NULL DEFAULT 0,
        _raw          TEXT NOT NULL
      )`);
      await execute(
        `CREATE INDEX IF NOT EXISTS idx_mov_lote_grupo ON mov_lote(idGrupo)`,
      );
    }
  }

  await execute(`PRAGMA user_version = ${CURRENT_VERSION}`);
}
