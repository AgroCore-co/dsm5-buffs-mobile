jest.mock('@op-engineering/op-sqlite');

import { __mockDb, __setMockRows } from '@op-engineering/op-sqlite';
import { queryAll, queryFirst, execute } from '../db';

beforeEach(() => {
  jest.clearAllMocks();
});

test('queryAll retorna array de linhas', async () => {
  __setMockRows([{ id: '1', nome: 'Brahman' }]);
  const rows = await queryAll('SELECT * FROM racas');
  expect(rows).toEqual([{ id: '1', nome: 'Brahman' }]);
  expect(__mockDb.executeAsync).toHaveBeenCalledWith('SELECT * FROM racas', []);
});

test('queryFirst retorna primeira linha ou null', async () => {
  __setMockRows([]);
  const row = await queryFirst('SELECT * FROM racas WHERE idRaca = ?', ['x']);
  expect(row).toBeNull();
});

test('execute chama executeAsync com params', async () => {
  __setMockRows([]);
  await execute('DELETE FROM pending_operations WHERE id = ?', ['abc']);
  expect(__mockDb.executeAsync).toHaveBeenCalledWith(
    'DELETE FROM pending_operations WHERE id = ?',
    ['abc']
  );
});
