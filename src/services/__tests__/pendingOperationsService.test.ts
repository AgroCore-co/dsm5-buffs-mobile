jest.mock('@op-engineering/op-sqlite');
jest.mock('../../database/db');
jest.mock('react-native-uuid', () => ({ v4: () => 'test-uuid' }));

import { queryAll, execute } from '../../database/db';
import { enqueue, getPending, markSynced, incrementRetry } from '../pendingOperationsService';

const mockQueryAll = queryAll as jest.Mock;
const mockExecute = execute as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('enqueue insere operação na tabela pending_operations', async () => {
  mockExecute.mockResolvedValue(undefined);

  await enqueue('bufalos', 'CREATE', { id: 'abc', nome: 'Estrela' });

  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO pending_operations'),
    expect.arrayContaining(['test-uuid', 'bufalos', 'CREATE'])
  );
});

test('getPending retorna operações com retryCount < 5', async () => {
  mockQueryAll.mockResolvedValue([{ id: '1', status: 'PENDING', entity: 'bufalos' }]);

  const ops = await getPending();
  expect(ops).toHaveLength(1);
  expect(mockQueryAll).toHaveBeenCalledWith(
    expect.stringContaining('retryCount < ?'),
    [5]
  );
});

test('markSynced remove a operação da tabela', async () => {
  mockExecute.mockResolvedValue(undefined);
  await markSynced('op-id-1');
  expect(mockExecute).toHaveBeenCalledWith(
    'DELETE FROM pending_operations WHERE id = ?',
    ['op-id-1']
  );
});

test('incrementRetry atualiza retryCount via SQL', async () => {
  mockExecute.mockResolvedValue(undefined);
  await incrementRetry('op-id-2');
  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('retryCount + 1'),
    ['op-id-2']
  );
});
