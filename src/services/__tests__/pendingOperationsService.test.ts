jest.mock('@op-engineering/op-sqlite');
jest.mock('../../database/db');
jest.mock('react-native-uuid', () => ({ v4: () => 'test-uuid' }));

import { queryAll, execute } from '../../database/db';
import { enqueue, getPending, markSynced, incrementRetry } from '../pendingOperationsService';

const mockQueryAll = queryAll as jest.Mock;
const mockExecute = execute as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('enqueue grava endpoint/method resolvidos pelo registry (pesagens CREATE)', async () => {
  mockExecute.mockResolvedValue(undefined);

  await enqueue('pesagens', 'CREATE', { id: 'z1', bufaloId: 'b9' });

  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO pending_operations'),
    expect.arrayContaining(['test-uuid', 'pesagens', 'CREATE', '/dados-zootecnicos/bufalo/b9', 'POST'])
  );
});

test('enqueue grava o body transformado (bufalos mover grupo)', async () => {
  mockExecute.mockResolvedValue(undefined);

  await enqueue('bufalos', 'UPDATE', { id: 'b1', idsBufalos: ['b1'], idNovoGrupo: 'g2', motivo: 'manual' });

  const call = mockExecute.mock.calls[0];
  const params = call[1] as any[];
  expect(params).toEqual(
    expect.arrayContaining(['test-uuid', 'bufalos', 'UPDATE', '/bufalos/grupo/mover', 'PATCH'])
  );
  const storedBody = JSON.parse(params[5]);
  expect(storedBody).toEqual({ idsBufalos: ['b1'], idNovoGrupo: 'g2', motivo: 'manual' });
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
    [null, 'op-id-2']
  );
});
