jest.mock('../../src/database/db', () => ({
  queryAll: jest.fn(),
  queryFirst: jest.fn(),
  execute: jest.fn(),
}));

jest.mock('react-native-uuid', () => ({ v4: () => 'mock-uuid' }));

import { queryAll, queryFirst, execute } from '../../src/database/db';
import {
  enqueue,
  getPending,
  markSynced,
  incrementRetry,
  getPendingCount,
  getFailedCount,
} from '../../src/services/pendingOperationsService';

beforeEach(() => jest.clearAllMocks());

describe('enqueue', () => {
  it('inserts a pending operation row', async () => {
    (execute as jest.Mock).mockResolvedValue(undefined);
    await enqueue('bufalos', 'CREATE', { id: '1', brinco: 'A001' });
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pending_operations'),
      expect.arrayContaining(['mock-uuid', 'bufalos', 'CREATE']),
    );
  });
});

describe('getPending', () => {
  it('returns operations below max retries', async () => {
    const ops = [{ id: '1', entity: 'bufalos', operation: 'CREATE', payload: '{}', retryCount: 0, createdAt: '' }];
    (queryAll as jest.Mock).mockResolvedValue(ops);
    const result = await getPending();
    expect(result).toEqual(ops);
    expect(queryAll).toHaveBeenCalledWith(expect.stringContaining('retryCount < ?'), [5]);
  });
});

describe('markSynced', () => {
  it('deletes the operation by id', async () => {
    (execute as jest.Mock).mockResolvedValue(undefined);
    await markSynced('op-1');
    expect(execute).toHaveBeenCalledWith(expect.stringContaining('DELETE'), ['op-1']);
  });
});

describe('incrementRetry', () => {
  it('increments retryCount for the given id', async () => {
    (execute as jest.Mock).mockResolvedValue(undefined);
    await incrementRetry('op-1');
    expect(execute).toHaveBeenCalledWith(expect.stringContaining('retryCount + 1'), [null, 'op-1']);
  });
});

describe('getPendingCount', () => {
  it('returns count of pending operations', async () => {
    (queryFirst as jest.Mock).mockResolvedValue({ count: 3 });
    const count = await getPendingCount();
    expect(count).toBe(3);
  });

  it('returns 0 when no rows', async () => {
    (queryFirst as jest.Mock).mockResolvedValue(null);
    const count = await getPendingCount();
    expect(count).toBe(0);
  });
});

describe('getFailedCount', () => {
  it('returns count of failed operations', async () => {
    (queryFirst as jest.Mock).mockResolvedValue({ count: 2 });
    const count = await getFailedCount();
    expect(count).toBe(2);
  });
});
