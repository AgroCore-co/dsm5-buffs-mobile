jest.mock('@op-engineering/op-sqlite');
jest.mock('../../database/db');

import { queryAll, execute } from '../../database/db';
import { pendingOperationsService } from '../pendingOperationsService';

const mockQueryAll = queryAll as jest.Mock;
const mockExecute = execute as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('enqueue insere operação na tabela pending_operations', async () => {
  mockExecute.mockResolvedValue(undefined);

  await pendingOperationsService.enqueue({
    entity: 'bufalos',
    operation: 'CREATE',
    endpoint: '/bufalos',
    method: 'POST',
    payload: JSON.stringify({ idBufalo: 'abc', nome: 'Estrela' }),
  });

  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO pending_operations'),
    expect.arrayContaining(['bufalos', 'CREATE', '/bufalos', 'POST'])
  );
});

test('getPending retorna somente operações PENDING', async () => {
  mockQueryAll.mockResolvedValue([{ id: '1', status: 'PENDING', entity: 'bufalos' }]);

  const ops = await pendingOperationsService.getPending();
  expect(ops).toHaveLength(1);
  expect(mockQueryAll).toHaveBeenCalledWith(
    expect.stringContaining("status = 'PENDING'"),
    []
  );
});

test('markSynced remove a operação da tabela', async () => {
  mockExecute.mockResolvedValue(undefined);
  await pendingOperationsService.markSynced('op-id-1');
  expect(mockExecute).toHaveBeenCalledWith(
    'DELETE FROM pending_operations WHERE id = ?',
    ['op-id-1']
  );
});

test('incrementRetry atualiza retryCount e status', async () => {
  mockExecute.mockResolvedValue(undefined);
  await pendingOperationsService.incrementRetry('op-id-2', 2, 'timeout');
  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('SET retryCount = ?, status = ?, errorMessage = ?'),
    expect.arrayContaining([3, 'FAILED', 'timeout', 'op-id-2'])
  );
});
