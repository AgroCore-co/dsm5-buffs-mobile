// src/services/__tests__/reproducaoService.transform.test.ts
import { getReproducoes } from '../reproducaoService';
import { queryAll, queryFirst } from '../../database/db';

jest.mock('../../database/db');
jest.mock('../pendingOperationsService');

const mockQueryAll = queryAll as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;

function makeReproRow(tipoInseminacao: string, extras = {}) {
  return { _raw: JSON.stringify({ id: 'r1', idBufala: 'b1', status: 'Em andamento', tipoInseminacao, dtEvento: '2026-01-01', ...extras }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryFirst.mockResolvedValue({ total: 1 });
  mockQueryAll.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM reproducoes')) return [makeReproRow('IA')];
    return [];
  });
});

describe('getReproducoes — tipoInseminacao transform', () => {
  it('retorna "IA" quando _raw tem tipoInseminacao = "IA"', async () => {
    mockQueryAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM reproducoes')) return [makeReproRow('IA')];
      return [];
    });
    const { reproducoes } = await getReproducoes('prop1');
    expect(reproducoes[0].tipoInseminacao).toBe('IA');
  });

  it('retorna "IATF" quando _raw tem tipoInseminacao = "IATF"', async () => {
    mockQueryAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM reproducoes')) return [makeReproRow('IATF')];
      return [];
    });
    const { reproducoes } = await getReproducoes('prop1');
    expect(reproducoes[0].tipoInseminacao).toBe('IATF');
  });

  it('retorna "Natural" quando _raw tem tipoInseminacao = "Monta Natural"', async () => {
    mockQueryAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM reproducoes')) return [makeReproRow('Monta Natural')];
      return [];
    });
    const { reproducoes } = await getReproducoes('prop1');
    expect(reproducoes[0].tipoInseminacao).toBe('Natural');
  });
});
