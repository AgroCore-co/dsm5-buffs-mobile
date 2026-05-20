jest.mock('@op-engineering/op-sqlite');

const { __mockDb, __setMockRows } = jest.requireMock('@op-engineering/op-sqlite') as {
  __mockDb: { execute: jest.Mock };
  __setMockRows: (rows: any[]) => void;
};
import { queryAll, queryFirst, execute } from '../db';

beforeEach(() => {
  jest.clearAllMocks();
});

test('queryAll retorna array de linhas', async () => {
  __setMockRows([{ id: '1', nome: 'Brahman' }]);
  const rows = await queryAll('SELECT * FROM racas');
  expect(rows).toEqual([{ id: '1', nome: 'Brahman' }]);
  expect(__mockDb.execute).toHaveBeenCalledWith('SELECT * FROM racas');
});

test('queryFirst retorna primeira linha ou null', async () => {
  __setMockRows([]);
  const row = await queryFirst('SELECT * FROM racas WHERE idRaca = ?', ['x']);
  expect(row).toBeNull();
});

test('execute chama execute com params', async () => {
  __setMockRows([]);
  await execute('DELETE FROM pending_operations WHERE id = ?', ['abc']);
  expect(__mockDb.execute).toHaveBeenCalledWith(
    'DELETE FROM pending_operations WHERE id = ?',
    ['abc']
  );
});
