import { ENTITY_PK_MAP, ENTITY_API_PK_MAP, getEntityExtras, CREATE_TABLES_SQL } from '../../src/database/schema';

describe('schema — lotes', () => {
  test('lotes está em ENTITY_PK_MAP e ENTITY_API_PK_MAP', () => {
    expect(ENTITY_PK_MAP.lotes).toBe('id');
    expect(ENTITY_API_PK_MAP.lotes).toBe('idLote');
  });

  test('getEntityExtras extrai propriedadeId e idGrupo (grupo aninhado)', () => {
    const record = { idLote: 'l1', idPropriedade: 'p1', grupo: { idGrupo: 'g1' } };
    expect(getEntityExtras('lotes', record)).toEqual({ propriedadeId: 'p1', idGrupo: 'g1' });
  });

  test('getEntityExtras aceita idGrupo no topo como fallback', () => {
    const record = { idLote: 'l1', propriedadeId: 'p1', idGrupo: 'g9' };
    expect(getEntityExtras('lotes', record)).toEqual({ propriedadeId: 'p1', idGrupo: 'g9' });
  });

  test('CREATE_TABLES_SQL inclui a tabela lotes', () => {
    const hasLotes = CREATE_TABLES_SQL.some((sql) => /CREATE TABLE IF NOT EXISTS lotes/.test(sql));
    expect(hasLotes).toBe(true);
  });
});

describe('schema — ordenhas', () => {
  test('ordenhas está em ENTITY_PK_MAP com id', () => {
    expect(ENTITY_PK_MAP.ordenhas).toBe('id');
  });

  test('getEntityExtras extrai propriedadeId, bufaloId e idCicloLactacao', () => {
    const record = { idBufala: 'b1', idPropriedade: 'p1', idCicloLactacao: 'c1' };
    expect(getEntityExtras('ordenhas', record)).toEqual({ propriedadeId: 'p1', bufaloId: 'b1', idCicloLactacao: 'c1' });
  });

  test('CREATE_TABLES_SQL inclui a tabela ordenhas', () => {
    const hasOrdenhas = CREATE_TABLES_SQL.some((sql) => /CREATE TABLE IF NOT EXISTS ordenhas/.test(sql));
    expect(hasOrdenhas).toBe(true);
  });
});
