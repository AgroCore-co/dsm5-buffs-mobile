export const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS bufalos (
    id TEXT PRIMARY KEY,
    propriedadeId TEXT NOT NULL,
    brinco TEXT,
    sexo TEXT,
    nivelMaturidade TEXT,
    status INTEGER,
    idRaca TEXT,
    _raw TEXT NOT NULL,
    _synced INTEGER NOT NULL DEFAULT 0,
    updatedAt TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS ciclos_lactacao (
    id TEXT PRIMARY KEY,
    bufaloId TEXT NOT NULL,
    propriedadeId TEXT NOT NULL,
    status TEXT,
    _raw TEXT NOT NULL,
    _synced INTEGER NOT NULL DEFAULT 0,
    updatedAt TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS eventos_sanitarios (
    id TEXT PRIMARY KEY,
    bufaloId TEXT NOT NULL,
    propriedadeId TEXT NOT NULL,
    tipo TEXT,
    _raw TEXT NOT NULL,
    _synced INTEGER NOT NULL DEFAULT 0,
    updatedAt TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS reproducoes (
    id TEXT PRIMARY KEY,
    bufaloId TEXT NOT NULL,
    propriedadeId TEXT NOT NULL,
    tipo TEXT,
    _raw TEXT NOT NULL,
    _synced INTEGER NOT NULL DEFAULT 0,
    updatedAt TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS pesagens (
    id TEXT PRIMARY KEY,
    bufaloId TEXT NOT NULL,
    propriedadeId TEXT NOT NULL,
    _raw TEXT NOT NULL,
    _synced INTEGER NOT NULL DEFAULT 0,
    updatedAt TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS grupos (
    id TEXT PRIMARY KEY,
    propriedadeId TEXT NOT NULL,
    nome TEXT,
    _raw TEXT NOT NULL,
    _synced INTEGER NOT NULL DEFAULT 0,
    updatedAt TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS alertas (
    id TEXT PRIMARY KEY,
    propriedadeId TEXT NOT NULL,
    tipo TEXT,
    _raw TEXT NOT NULL,
    _synced INTEGER NOT NULL DEFAULT 0,
    updatedAt TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS racas (
    id TEXT PRIMARY KEY,
    nome TEXT,
    _raw TEXT NOT NULL,
    _synced INTEGER NOT NULL DEFAULT 1,
    updatedAt TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS medicamentos (
    id TEXT PRIMARY KEY,
    nome TEXT,
    _raw TEXT NOT NULL,
    _synced INTEGER NOT NULL DEFAULT 1,
    updatedAt TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS pending_operations (
    id TEXT PRIMARY KEY,
    entity TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    retryCount INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS sync_meta (
    entity TEXT NOT NULL,
    propriedadeId TEXT NOT NULL,
    lastSyncedAt TEXT,
    PRIMARY KEY (entity, propriedadeId)
  )`,
];

export const ENTITY_PK_MAP: Record<string, string> = {
  bufalos: 'id',
  ciclos_lactacao: 'id',
  eventos_sanitarios: 'id',
  reproducoes: 'id',
  pesagens: 'id',
  grupos: 'id',
  alertas: 'id',
  racas: 'id',
  medicamentos: 'id',
};

export const SYNC_ENTITY_PATH: Record<string, string> = {
  bufalos: 'bufalos',
  ciclos_lactacao: 'lactacao/ciclos',
  eventos_sanitarios: 'sanitario/eventos',
  reproducoes: 'reproducao',
  pesagens: 'zootecnico/pesagens',
  grupos: 'grupos',
  alertas: 'alertas',
  racas: 'racas',
  medicamentos: 'medicamentos',
};

interface EntityExtra {
  columns: string[];
  values: (row: any) => any[];
}

export function getEntityExtras(entity: string): EntityExtra {
  switch (entity) {
    case 'bufalos':
      return {
        columns: ['propriedadeId', 'brinco', 'sexo', 'nivelMaturidade', 'status', 'idRaca', 'updatedAt'],
        values: (r) => [r.propriedadeId, r.brinco, r.sexo, r.nivelMaturidade, r.status ? 1 : 0, r.idRaca, r.updatedAt],
      };
    case 'ciclos_lactacao':
      return {
        columns: ['bufaloId', 'propriedadeId', 'status', 'updatedAt'],
        values: (r) => [r.bufaloId, r.propriedadeId, r.status, r.updatedAt],
      };
    case 'eventos_sanitarios':
      return {
        columns: ['bufaloId', 'propriedadeId', 'tipo', 'updatedAt'],
        values: (r) => [r.bufaloId, r.propriedadeId, r.tipo, r.updatedAt],
      };
    case 'reproducoes':
      return {
        columns: ['bufaloId', 'propriedadeId', 'tipo', 'updatedAt'],
        values: (r) => [r.bufaloId, r.propriedadeId, r.tipo, r.updatedAt],
      };
    case 'pesagens':
      return {
        columns: ['bufaloId', 'propriedadeId', 'updatedAt'],
        values: (r) => [r.bufaloId, r.propriedadeId, r.updatedAt],
      };
    case 'grupos':
      return {
        columns: ['propriedadeId', 'nome', 'updatedAt'],
        values: (r) => [r.propriedadeId, r.nome, r.updatedAt],
      };
    case 'alertas':
      return {
        columns: ['propriedadeId', 'tipo', 'updatedAt'],
        values: (r) => [r.propriedadeId, r.tipo, r.updatedAt],
      };
    case 'racas':
      return {
        columns: ['nome', 'updatedAt'],
        values: (r) => [r.nome, r.updatedAt],
      };
    case 'medicamentos':
      return {
        columns: ['nome', 'updatedAt'],
        values: (r) => [r.nome, r.updatedAt],
      };
    default:
      return { columns: [], values: () => [] };
  }
}
