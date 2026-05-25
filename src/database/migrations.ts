import { CREATE_TABLES_SQL } from './schema';
import { execute, queryFirst } from './db';

const CURRENT_VERSION = 12;

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
    if (version < 11) {
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
      // v11 — tabelas de tiles offline
      await execute(`CREATE TABLE IF NOT EXISTS offline_tiles (
        propriedadeId TEXT    NOT NULL,
        z             INTEGER NOT NULL,
        x             INTEGER NOT NULL,
        y             INTEGER NOT NULL,
        data          TEXT    NOT NULL,
        PRIMARY KEY (propriedadeId, z, x, y)
      )`);
      await execute(`CREATE TABLE IF NOT EXISTS offline_tiles_meta (
        propriedadeId TEXT    PRIMARY KEY,
        downloadedAt  TEXT    NOT NULL,
        zoomMin       INTEGER NOT NULL,
        zoomMax       INTEGER NOT NULL,
        totalTiles    INTEGER NOT NULL,
        minLat        REAL    NOT NULL,
        maxLat        REAL    NOT NULL,
        minLng        REAL    NOT NULL,
        maxLng        REAL    NOT NULL
      )`);
    }
    if (version < 12) {
      // v12 — cache de dashboard de produção mensal (dados do servidor)
      await execute(`CREATE TABLE IF NOT EXISTS dashboard_producao_mensal (
        propriedadeId   TEXT NOT NULL,
        mes             TEXT NOT NULL,
        total_litros    REAL NOT NULL DEFAULT 0,
        qtd_bufalas     INTEGER NOT NULL DEFAULT 0,
        media_diaria    REAL NOT NULL DEFAULT 0,
        syncedAt        TEXT NOT NULL,
        PRIMARY KEY (propriedadeId, mes)
      )`);
      await execute(
        `CREATE INDEX IF NOT EXISTS idx_dash_prod_prop ON dashboard_producao_mensal(propriedadeId)`,
      );
    }
  }

  await execute(`PRAGMA user_version = ${CURRENT_VERSION}`);
}
