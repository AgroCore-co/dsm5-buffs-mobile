// src/services/__tests__/lactacaoService.encerrar.test.ts
import { encerrarLactacao } from '../lactacaoService';
import { queryFirst, execute } from '../../database/db';
import { enqueue } from '../pendingOperationsService';

jest.mock('../../database/db');
jest.mock('../pendingOperationsService');

const mockExecute = execute as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryFirst.mockResolvedValue({
    _raw: JSON.stringify({ id: 'c1', status: 'Em Lactação', idBufala: 'b1' }),
  });
  mockExecute.mockResolvedValue(undefined);
  mockEnqueue.mockResolvedValue(undefined);
});

describe('encerrarLactacao', () => {
  it('atualiza status no _raw para "seco"', async () => {
    await encerrarLactacao('c1');
    const updateCall = mockExecute.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE ciclos_lactacao')
    );
    expect(updateCall).toBeDefined();
    const sql: string = updateCall![0];
    expect(sql).toMatch(/_raw/);
  });

  it('status no _raw é "seco" após encerrar', async () => {
    await encerrarLactacao('c1');
    const updateCall = mockExecute.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE ciclos_lactacao') && c[0].includes('_raw')
    );
    expect(updateCall).toBeDefined();
    const params = updateCall![1];
    const rawParam = params.find((p: any) => {
      try { const obj = JSON.parse(p); return typeof obj === 'object' && obj !== null; }
      catch { return false; }
    });
    expect(rawParam).toBeDefined();
    const raw = JSON.parse(rawParam);
    expect(raw.status).toBe('seco');
  });
});
