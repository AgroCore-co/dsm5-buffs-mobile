jest.mock('@op-engineering/op-sqlite');
jest.mock('@react-native-community/netinfo');
jest.mock('../../database/db');
jest.mock('../../lib/apiClient');
jest.mock('../pendingOperationsService');
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

import { queryFirst, execute } from '../../database/db';
import { apiFetch } from '../../lib/apiClient';
import { getPending, markSynced, incrementRetry } from '../pendingOperationsService';
import { syncService } from '../syncService';

const { __setConnected } = jest.requireMock('@react-native-community/netinfo') as {
  __setConnected: (val: boolean) => void;
};

const mockQueryFirst = queryFirst as jest.Mock;
const mockExecute = execute as jest.Mock;
const mockApiFetch = apiFetch as jest.Mock;
const mockGetPending = getPending as jest.Mock;
const mockMarkSynced = markSynced as jest.Mock;
const mockIncrementRetry = incrementRetry as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  __setConnected(true);
});

test('sync não executa quando offline', async () => {
  __setConnected(false);
  await syncService.sync('prop-id');
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('push envia operações pendentes e marca como synced', async () => {
  mockGetPending.mockResolvedValue([{
    id: 'op-1',
    endpoint: '/bufalos',
    method: 'POST',
    payload: '{"idBufalo":"b1","nome":"Estrela"}',
    entity: 'bufalos',
    retryCount: 0,
  }]);
  mockApiFetch.mockResolvedValue({ idBufalo: 'b1' });
  mockMarkSynced.mockResolvedValue(undefined);
  mockExecute.mockResolvedValue(undefined);

  await (syncService as any).push();

  expect(mockApiFetch).toHaveBeenCalledWith('/bufalos', { method: 'POST', body: expect.any(String) });
  expect(mockMarkSynced).toHaveBeenCalledWith('op-1');
});

test('pull chama /sync endpoint e faz upsert', async () => {
  mockQueryFirst.mockResolvedValue(null); // sem sync_meta
  mockApiFetch.mockResolvedValue([
    { idBufalo: 'b1', idPropriedade: 'p1', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null, brinco: 'A001', _raw: '' }
  ]);
  mockExecute.mockResolvedValue(undefined);

  await (syncService as any).pullEntity('bufalos', 'p1');

  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('/sync/bufalos'));
  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO bufalos'),
    expect.any(Array)
  );
});

test('pull de lotes usa /sync/lotes (flat, incremental)', async () => {
  mockQueryFirst.mockResolvedValue(null);
  mockApiFetch.mockResolvedValue([
    { idLote: 'l1', idPropriedade: 'p1', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null, grupo: { idGrupo: 'g1' } }
  ]);
  mockExecute.mockResolvedValue(undefined);

  await (syncService as any).pullEntity('lotes', 'p1');

  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('/sync/lotes'));
  expect(mockApiFetch).not.toHaveBeenCalledWith('/lotes/propriedade/p1');
  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO lotes'),
    expect.any(Array)
  );
});

test('push para ao primeiro CREATE que falha — operações seguintes não são processadas', async () => {
  const opCreateA = { id: 'op-1', operation: 'CREATE', entity: 'bufalos', endpoint: '/bufalos', method: 'POST', payload: '{"id":"b1"}', retryCount: 0 };
  const opCreateB = { id: 'op-2', operation: 'CREATE', entity: 'lotes', endpoint: '/lotes', method: 'POST', payload: '{"id":"l1"}', retryCount: 0 };
  const opUpdate = { id: 'op-3', operation: 'UPDATE', entity: 'bufalos', endpoint: '/bufalos/b1', method: 'PATCH', payload: '{"id":"b1","nome":"X"}', retryCount: 0 };

  mockGetPending.mockResolvedValue([opCreateA, opCreateB, opUpdate]);
  mockApiFetch.mockRejectedValueOnce(new Error('Network error'));
  mockIncrementRetry.mockResolvedValue(undefined);

  await (syncService as any).push();

  expect(mockApiFetch).toHaveBeenCalledTimes(1);
  expect(mockMarkSynced).not.toHaveBeenCalled();
  expect(mockIncrementRetry).toHaveBeenCalledWith('op-1', 'Network error');
});

test('pull de ordenhas chama /sync/ordenha (não pula mais)', async () => {
  mockQueryFirst.mockResolvedValue(null);
  mockApiFetch.mockResolvedValue([
    { idLact: 'ord1', idBufala: 'b1', idPropriedade: 'p1', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null },
  ]);
  mockExecute.mockResolvedValue(undefined);

  await (syncService as any).pullEntity('ordenhas', 'p1');

  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('/sync/ordenha'));
  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO ordenhas'),
    expect.any(Array)
  );
});

test('pull de lotes usa /sync/lotes (flat) em vez do REST /lotes/propriedade/:id', async () => {
  mockQueryFirst.mockResolvedValue(null);
  mockApiFetch.mockResolvedValue([
    { idLote: 'l1', idPropriedade: 'p1', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null },
  ]);
  mockExecute.mockResolvedValue(undefined);

  await (syncService as any).pullEntity('lotes', 'p1');

  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('/sync/lotes'));
  expect(mockApiFetch).not.toHaveBeenCalledWith('/lotes/propriedade/p1');
  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO lotes'),
    expect.any(Array)
  );
});

test('pull de material_genetico chama /sync/:id/material-genetico (endpoint paginado)', async () => {
  mockQueryFirst.mockResolvedValue(null);
  mockApiFetch.mockResolvedValue({ data: [
    { idMaterial: 'mat1', idPropriedade: 'p1', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null },
  ], meta: { page: 1, totalPages: 1 } });
  mockExecute.mockResolvedValue(undefined);

  await (syncService as any).pullEntity('material_genetico', 'p1');

  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('/p1/material-genetico'));
  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO material_genetico'),
    expect.any(Array)
  );
});

test('push continua após UPDATE/DELETE que falha — só CREATE para o loop', async () => {
  const opUpdate = { id: 'op-1', operation: 'UPDATE', entity: 'bufalos', endpoint: '/bufalos/b1', method: 'PATCH', payload: '{"id":"b1"}', retryCount: 0 };
  const opDelete = { id: 'op-2', operation: 'DELETE', entity: 'bufalos', endpoint: '/bufalos/b2', method: 'DELETE', payload: '{"id":"b2"}', retryCount: 0 };

  mockGetPending.mockResolvedValue([opUpdate, opDelete]);
  mockApiFetch.mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce({});
  mockIncrementRetry.mockResolvedValue(undefined);
  mockMarkSynced.mockResolvedValue(undefined);
  mockExecute.mockResolvedValue(undefined);

  await (syncService as any).push();

  expect(mockApiFetch).toHaveBeenCalledTimes(2);
  expect(mockMarkSynced).toHaveBeenCalledWith('op-2');
});

test('push de entidade fire-and-forget (retiradas) não tenta UPDATE em tabela local', async () => {
  mockGetPending.mockResolvedValue([{
    id: 'op-ret',
    operation: 'CREATE',
    entity: 'retiradas',
    endpoint: '/retiradas',
    method: 'POST',
    payload: '{"id":"r1","idPropriedade":"p1","quantidade":50}',
    retryCount: 0,
  }]);
  mockApiFetch.mockResolvedValue({ id: 'r1' });
  mockMarkSynced.mockResolvedValue(undefined);

  await (syncService as any).push();

  expect(mockMarkSynced).toHaveBeenCalledWith('op-ret');
  const updateCalls = mockExecute.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.includes('UPDATE retiradas')
  );
  expect(updateCalls).toHaveLength(0);
});

describe('syncService — pullMaterialGenetico', () => {
  it('usa endpoint paginado /sync/:id/material-genetico (não o flat)', async () => {
    __setConnected(true);
    const capturedUrls: string[] = [];
    mockApiFetch.mockImplementation(async (url: string) => {
      capturedUrls.push(url);
      if (url.includes('/prop1/material-genetico')) {
        return { data: [{ idMaterial: 'mat1', tipo: 'Sêmen', fornecedor: 'Central XYZ', idPropriedade: 'prop1', updatedAt: '2026-01-01T00:00:00Z' }], meta: { page: 1, totalPages: 1 } };
      }
      return [];
    });
    mockQueryFirst.mockResolvedValue(null);
    mockExecute.mockResolvedValue(undefined);
    mockGetPending.mockResolvedValue([]);

    await syncService.sync('prop1');

    const matUrl = capturedUrls.find(u => u.includes('material-genetico'));
    expect(matUrl).toBeDefined();
    expect(matUrl).toMatch(/\/prop1\/material-genetico/);

    const insertCalls = mockExecute.mock.calls.filter(c =>
      typeof c[0] === 'string' && c[0].includes('material_genetico')
    );
    expect(insertCalls.length).toBeGreaterThan(0);
  });
});
