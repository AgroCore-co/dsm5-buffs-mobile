export const ENTITY_PK_MAP: Record<string, string> = {
  bufalos: 'id',
  ciclos_lactacao: 'id',
  grupos: 'id',
  racas: 'id',
  pesagens: 'id',
  medicamentos: 'id',
  eventos_sanitarios: 'id',
  alertas: 'id',
  reproducoes: 'id',
  lotes: 'id',
  ordenhas: 'id',
  material_genetico: 'id',
  industrias: 'id',
};

// Campo de PK que a API retorna por entidade (antes da normalização para 'id')
export const ENTITY_API_PK_MAP: Record<string, string> = {
  bufalos: 'idBufalo',
  ciclos_lactacao: 'idCicloLactacao',
  grupos: 'idGrupo',
  racas: 'idRaca',
  pesagens: 'idZootec',
  medicamentos: 'idMedicacao',
  eventos_sanitarios: 'idSanit',
  alertas: 'idAlerta',
  reproducoes: 'idReproducao',
  lotes: 'idLote',
  ordenhas: 'idLact',
  material_genetico: 'idMaterial',
  // sync endpoint returns id_industria (snake_case)
  industrias: 'id_industria',
};

export const SYNC_ENTITY_PATH: Record<string, string> = {
  bufalos: 'bufalos',
  ciclos_lactacao: 'lactacao/ciclos',
  grupos: 'grupos',
  racas: 'racas',
  pesagens: 'zootecnico/pesagens',
  medicamentos: 'medicacoes',
  eventos_sanitarios: 'sanitario/eventos',
  alertas: 'alertas',
  reproducoes: 'reproducao',
  lotes: 'lotes',
  ordenhas: 'ordenha',
  material_genetico: 'material-genetico',
  industrias: 'laticinios',
};

// Retorna colunas queryáveis por entidade (além de id/updatedAt/deletedAt/_raw)
export function getEntityExtras(entity: string, record: any): Record<string, any> {
  const idProp = { propriedadeId: record.idPropriedade ?? record.propriedadeId ?? null };
  switch (entity) {
    case 'bufalos':
      return {
        ...idProp,
        brinco: record.brinco ?? null,
        sexo: record.sexo ?? null,
        status: record.status ?? null,
        nivelMaturidade: record.nivelMaturidade ?? null,
        idRaca: record.idRaca ?? null,
        microchip: record.microchip ?? null,
      };
    case 'ciclos_lactacao':
      return { ...idProp, idBufala: record.idBufala ?? null, status: record.status ?? null };
    case 'grupos':
      return { ...idProp, nome: record.nomeGrupo ?? record.nome ?? null };
    case 'racas':
      return { nome: record.nome ?? null };
    case 'pesagens':
      return { ...idProp, bufaloId: record.idBufalo ?? record.bufaloId ?? null };
    case 'medicamentos':
      return { ...idProp, nome: record.medicacao ?? record.nome ?? null };
    case 'eventos_sanitarios':
      return { ...idProp, bufaloId: record.idBufalo ?? record.bufaloId ?? null };
    case 'alertas':
      return { ...idProp, lido: record.visto ? 1 : (record.lido ? 1 : 0) };
    case 'reproducoes':
      return { ...idProp, bufaloId: record.idBufala ?? record.bufaloId ?? null };
    case 'lotes':
      return { ...idProp, idGrupo: record.grupo?.idGrupo ?? record.idGrupo ?? null };
    case 'ordenhas':
      return {
        ...idProp,
        bufaloId: record.idBufala ?? record.bufaloId ?? null,
        idCicloLactacao: record.idCicloLactacao ?? null,
      };
    case 'material_genetico':
      return { ...idProp };
    case 'industrias':
      return { ...idProp, nome: record.nome ?? null };
    default:
      return { ...idProp };
  }
}

export const CREATE_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS bufalos (
    id              TEXT PRIMARY KEY,
    propriedadeId   TEXT,
    brinco          TEXT,
    sexo            TEXT,
    status          INTEGER DEFAULT 0,
    nivelMaturidade TEXT,
    idRaca          TEXT,
    microchip       TEXT,
    updatedAt       TEXT NOT NULL,
    deletedAt       TEXT,
    _synced         INTEGER NOT NULL DEFAULT 0,
    _raw            TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bufalos_prop ON bufalos(propriedadeId)`,
  `CREATE INDEX IF NOT EXISTS idx_bufalos_brinco ON bufalos(brinco)`,
  `CREATE TABLE IF NOT EXISTS ciclos_lactacao (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT,
    idBufala      TEXT,
    status        TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_lactacao_prop ON ciclos_lactacao(propriedadeId)`,
  `CREATE TABLE IF NOT EXISTS grupos (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT,
    nome          TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS racas (
    id        TEXT PRIMARY KEY,
    nome      TEXT,
    updatedAt TEXT NOT NULL,
    deletedAt TEXT,
    _synced   INTEGER NOT NULL DEFAULT 0,
    _raw      TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS pesagens (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT,
    bufaloId      TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pesagens_bufalo ON pesagens(bufaloId)`,
  `CREATE TABLE IF NOT EXISTS medicamentos (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT,
    nome          TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS eventos_sanitarios (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT,
    bufaloId      TEXT,
    tipo          TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sanitario_bufalo ON eventos_sanitarios(bufaloId)`,
  `CREATE TABLE IF NOT EXISTS alertas (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT,
    lido          INTEGER DEFAULT 0,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reproducoes (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT,
    bufaloId      TEXT,
    tipo          TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS material_genetico (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS lotes (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT,
    idGrupo       TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_lotes_prop ON lotes(propriedadeId)`,
  `CREATE TABLE IF NOT EXISTS ordenhas (
    id              TEXT PRIMARY KEY,
    propriedadeId   TEXT,
    bufaloId        TEXT,
    idCicloLactacao TEXT,
    updatedAt       TEXT NOT NULL,
    deletedAt       TEXT,
    _synced         INTEGER NOT NULL DEFAULT 0,
    _raw            TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ordenhas_ciclo ON ordenhas(idCicloLactacao)`,
  `CREATE TABLE IF NOT EXISTS industrias (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT,
    nome          TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_industrias_prop ON industrias(propriedadeId)`,
  `CREATE TABLE IF NOT EXISTS producao_diaria (
    id            TEXT PRIMARY KEY,
    propriedadeId TEXT NOT NULL,
    quantidade    REAL NOT NULL,
    dtRegistro    TEXT NOT NULL,
    observacao    TEXT,
    createdAt     TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_producao_prop ON producao_diaria(propriedadeId)`,
  `CREATE TABLE IF NOT EXISTS sync_meta (
    entity        TEXT NOT NULL,
    propriedadeId TEXT NOT NULL,
    lastSyncedAt  TEXT,
    PRIMARY KEY (entity, propriedadeId)
  )`,
  `CREATE TABLE IF NOT EXISTS pending_operations (
    id           TEXT PRIMARY KEY,
    entity       TEXT NOT NULL,
    operation    TEXT NOT NULL,
    endpoint     TEXT NOT NULL,
    method       TEXT NOT NULL,
    payload      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'PENDING',
    retryCount   INTEGER NOT NULL DEFAULT 0,
    errorMessage TEXT,
    createdAt    TEXT NOT NULL
  )`,
];
