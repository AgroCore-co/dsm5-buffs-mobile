jest.mock('../../database/db');
jest.mock('../pendingOperationsService', () => ({ enqueue: jest.fn() }));
jest.mock('react-native-uuid', () => ({ v4: () => 'grupo-uuid' }));

import { queryAll } from '../../database/db';
import { grupoService } from '../grupoService';

const mockQueryAll = queryAll as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('grupoService.getAllByPropriedade — enriquecido', () => {
  const grupoRaw = JSON.stringify({
    idGrupo: 'g1',
    nomeGrupo: 'Lactantes',
    color: '#4CAF50',
    idPropriedade: 'prop-1',
  });

  const loteRaw = JSON.stringify({
    idLote: 'l1',
    nomeLote: 'Piquete 04',
    idGrupo: 'g1',
    qtd_max: 50,
    idPropriedade: 'prop-1',
  });

  it('retorna piquete e qtdMax do lote associado ao grupo', async () => {
    mockQueryAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM grupos')) return [{ _raw: grupoRaw }];
      if (sql.includes('FROM lotes'))  return [{ _raw: loteRaw }];
      if (sql.includes('FROM bufalos')) return [{ idGrupo: 'g1', total: 12 }];
      return [];
    });

    const result = await grupoService.getAllByPropriedade('prop-1');

    expect(result).toHaveLength(1);
    expect(result[0].piquete).toBe('Piquete 04');
    expect(result[0].qtdMax).toBe(50);
  });

  it('retorna quantidade de búfalos no grupo via json_extract', async () => {
    mockQueryAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM grupos'))  return [{ _raw: grupoRaw }];
      if (sql.includes('FROM lotes'))   return [{ _raw: loteRaw }];
      if (sql.includes('FROM bufalos')) return [{ idGrupo: 'g1', total: 12 }];
      return [];
    });

    const result = await grupoService.getAllByPropriedade('prop-1');

    expect(result[0].quantidade).toBe(12);
    const bufaloCall = mockQueryAll.mock.calls.find(([sql]: [string]) => sql.includes('FROM bufalos'));
    expect(bufaloCall).toBeDefined();
    expect(bufaloCall[0]).toContain('json_extract');
    expect(bufaloCall[0]).toContain('idGrupo');
  });

  it('calcula ocupacao como (quantidade / qtdMax * 100), arredondado', async () => {
    mockQueryAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM grupos'))  return [{ _raw: grupoRaw }];
      if (sql.includes('FROM lotes'))   return [{ _raw: loteRaw }]; // qtd_max = 50
      if (sql.includes('FROM bufalos')) return [{ idGrupo: 'g1', total: 25 }]; // 25/50 = 50%
      return [];
    });

    const result = await grupoService.getAllByPropriedade('prop-1');

    expect(result[0].ocupacao).toBe(50);
  });

  it('retorna piquete "Sem piquete" e ocupacao 0 quando grupo não tem lote', async () => {
    mockQueryAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM grupos'))  return [{ _raw: grupoRaw }];
      if (sql.includes('FROM lotes'))   return [];
      if (sql.includes('FROM bufalos')) return [];
      return [];
    });

    const result = await grupoService.getAllByPropriedade('prop-1');

    expect(result[0].piquete).toBe('Sem piquete');
    expect(result[0].qtdMax).toBe(0);
    expect(result[0].ocupacao).toBe(0);
  });

  it('limita ocupacao a 100% mesmo se quantidade superar qtdMax', async () => {
    mockQueryAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM grupos'))  return [{ _raw: grupoRaw }];
      if (sql.includes('FROM lotes'))   return [{ _raw: loteRaw }]; // qtd_max = 50
      if (sql.includes('FROM bufalos')) return [{ idGrupo: 'g1', total: 60 }]; // 60 > 50
      return [];
    });

    const result = await grupoService.getAllByPropriedade('prop-1');

    expect(result[0].ocupacao).toBe(100);
  });
});
