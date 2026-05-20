jest.mock('@op-engineering/op-sqlite');
jest.mock('@react-native-community/netinfo');
jest.mock('../../database/db');
jest.mock('../../lib/apiClient');
jest.mock('../pendingOperationsService');
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

import { queryAll, queryFirst, execute } from '../../database/db';
import { apiFetch } from '../../lib/apiClient';
import { pendingOperationsService } from '../pendingOperationsService';
import { syncService } from '../syncService';
import { __setConnected } from '@react-native-community/netinfo';

const mockQueryAll = queryAll as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;
const mockExecute = execute as jest.Mock;
const mockApiFetch = apiFetch as jest.Mock;
const mockGetPending = pendingOperationsService.getPending as jest.Mock;
const mockMarkSynced = pendingOperationsService.markSynced as jest.Mock;

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
