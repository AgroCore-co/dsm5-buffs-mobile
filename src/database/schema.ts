export const ENTITY_PK_MAP: Record<string, string> = {
  bufalos: 'idBufalo',
  ciclos_lactacao: 'idCicloLactacao',
  grupos: 'idGrupo',
  racas: 'idRaca',
  dados_zootecnicos: 'idDadoZootecnico',
  medicamentos: 'idMedicamento',
  dados_sanitarios: 'idDadoSanitario',
  alertas: 'idAlerta',
  coberturas: 'idCobertura',
  material_genetico: 'idMaterialGenetico',
};

export const SYNC_ENTITY_PATH: Record<string, string> = {
  bufalos: 'bufalos',
  ciclos_lactacao: 'lactacao/ciclos',
  grupos: 'grupos',
  racas: 'racas',
  dados_zootecnicos: 'zootecnico/pesagens',
  medicamentos: 'medicacoes',
  dados_sanitarios: 'sanitario/eventos',
  alertas: 'alertas',
  coberturas: 'reproducao',
  material_genetico: 'material-genetico',
};

// Retorna colunas queryáveis por entidade (além de pk/updatedAt/deletedAt/_raw)
export function getEntityExtras(entity: string, record: any): Record<string, any> {
  const idProp = { idPropriedade: record.idPropriedade ?? null };
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
      return { ...idProp, nome: record.nome ?? null };
    case 'racas':
      return { nome: record.nome ?? null };         // sem idPropriedade (global)
    case 'dados_zootecnicos':
      return { ...idProp, idBufalo: record.idBufalo ?? null };
    case 'medicamentos':
      return { nome: record.nome ?? null };          // sem idPropriedade (global)
    case 'dados_sanitarios':
      return { ...idProp, idBufalo: record.idBufalo ?? null };
    case 'alertas':
      return { ...idProp, lido: record.lido ? 1 : 0 };
    case 'coberturas':
      return { ...idProp, idBufala: record.idBufala ?? null };
    case 'material_genetico':
      return { ...idProp };
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
    idCicloLactacao TEXT PRIMARY KEY,
    propriedadeId   TEXT,
    idBufala        TEXT,
    status          TEXT,
    updatedAt       TEXT NOT NULL,
    deletedAt       TEXT,
    _synced         INTEGER NOT NULL DEFAULT 0,
    _raw            TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_lactacao_prop ON ciclos_lactacao(propriedadeId)`,
  `CREATE TABLE IF NOT EXISTS grupos (
    idGrupo       TEXT PRIMARY KEY,
    propriedadeId TEXT,
    nome          TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS racas (
    idRaca    TEXT PRIMARY KEY,
    nome      TEXT,
    updatedAt TEXT NOT NULL,
    deletedAt TEXT,
    _raw      TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dados_zootecnicos (
    idDadoZootecnico TEXT PRIMARY KEY,
    propriedadeId    TEXT,
    idBufalo         TEXT,
    updatedAt        TEXT NOT NULL,
    deletedAt        TEXT,
    _synced          INTEGER NOT NULL DEFAULT 0,
    _raw             TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_zootecnico_bufalo ON dados_zootecnicos(idBufalo)`,
  `CREATE TABLE IF NOT EXISTS medicamentos (
    idMedicamento TEXT PRIMARY KEY,
    nome          TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _raw          TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dados_sanitarios (
    idDadoSanitario TEXT PRIMARY KEY,
    propriedadeId   TEXT,
    idBufalo        TEXT,
    updatedAt       TEXT NOT NULL,
    deletedAt       TEXT,
    _synced         INTEGER NOT NULL DEFAULT 0,
    _raw            TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sanitario_bufalo ON dados_sanitarios(idBufalo)`,
  `CREATE TABLE IF NOT EXISTS alertas (
    idAlerta      TEXT PRIMARY KEY,
    propriedadeId TEXT,
    lido          INTEGER DEFAULT 0,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS coberturas (
    idCobertura   TEXT PRIMARY KEY,
    propriedadeId TEXT,
    idBufala      TEXT,
    updatedAt     TEXT NOT NULL,
    deletedAt     TEXT,
    _synced       INTEGER NOT NULL DEFAULT 0,
    _raw          TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS material_genetico (
    idMaterialGenetico TEXT PRIMARY KEY,
    propriedadeId      TEXT,
    updatedAt          TEXT NOT NULL,
    deletedAt          TEXT,
    _synced            INTEGER NOT NULL DEFAULT 0,
    _raw               TEXT NOT NULL
  )`,
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
