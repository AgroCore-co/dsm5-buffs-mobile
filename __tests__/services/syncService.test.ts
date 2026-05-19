jest.mock('../../src/lib/apiClient', () => ({ apiFetch: jest.fn() }));
jest.mock('../../src/database/db', () => ({
  queryAll: jest.fn(),
  execute: jest.fn(),
}));
jest.mock('../../src/services/pendingOperationsService', () => ({
  getPending: jest.fn(),
  markSynced: jest.fn(),
  incrementRetry: jest.fn(),
}));

import { apiFetch } from '../../src/lib/apiClient';
import { queryAll, execute } from '../../src/database/db';
import { getPending, markSynced, incrementRetry } from '../../src/services/pendingOperationsService';
import { upsertBatch, pullEntity, push, sync } from '../../src/services/syncService';

beforeEach(() => jest.clearAllMocks());

describe('upsertBatch', () => {
  it('does nothing for empty array', async () => {
    await upsertBatch('bufalos', []);
    expect(execute).not.toHaveBeenCalled();
  });

  it('inserts each row with _synced = 1', async () => {
    (execute as jest.Mock).mockResolvedValue(undefined);
    const row = { id: '1', propriedadeId: 'p1', brinco: 'A001', sexo: 'F', nivelMaturidade: null, status: true, idRaca: 'r1', updatedAt: '2026-01-01' };
    await upsertBatch('bufalos', [row]);
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO bufalos'),
      expect.arrayContaining(['1', JSON.stringify(row)]),
    );
  });
});

describe('pullEntity', () => {
  it('fetches from API and upserts rows', async () => {
    (queryAll as jest.Mock).mockResolvedValue([]);
    (apiFetch as jest.Mock).mockResolvedValue([{ id: '1', propriedadeId: 'p1', brinco: 'A001', sexo: 'F', nivelMaturidade: null, status: true, idRaca: 'r1', updatedAt: '2026-01-01' }]);
    (execute as jest.Mock).mockResolvedValue(undefined);

    await pullEntity('bufalos', 'p1');

    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/sync/bufalos'));
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO bufalos'),
      expect.any(Array),
    );
  });

  it('deletes soft-deleted rows that are synced', async () => {
    (queryAll as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ _synced: 1 }]);
    (apiFetch as jest.Mock).mockResolvedValue([{ id: 'del-1', deletedAt: '2026-01-01' }]);
    (execute as jest.Mock).mockResolvedValue(undefined);

    await pullEntity('bufalos', 'p1');

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM bufalos'),
      ['del-1'],
    );
  });
});

describe('push', () => {
  it('sends CREATE operations and marks them synced', async () => {
    (getPending as jest.Mock).mockResolvedValue([
      { id: 'op-1', entity: 'bufalos', operation: 'CREATE', payload: JSON.stringify({ id: '1' }), retryCount: 0 },
    ]);
    (apiFetch as jest.Mock).mockResolvedValue({});
    (markSynced as jest.Mock).mockResolvedValue(undefined);

    await push();

    expect(apiFetch).toHaveBeenCalledWith('/bufalos', { method: 'POST', body: { id: '1' } });
    expect(markSynced).toHaveBeenCalledWith('op-1');
  });

  it('increments retry on failure', async () => {
    (getPending as jest.Mock).mockResolvedValue([
      { id: 'op-1', entity: 'bufalos', operation: 'CREATE', payload: '{}', retryCount: 0 },
    ]);
    (apiFetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    (incrementRetry as jest.Mock).mockResolvedValue(undefined);

    await push();

    expect(incrementRetry).toHaveBeenCalledWith('op-1');
    expect(markSynced).not.toHaveBeenCalled();
  });
});

describe('sync', () => {
  it('prevents concurrent syncs', async () => {
    (getPending as jest.Mock).mockResolvedValue([]);
    (queryAll as jest.Mock).mockResolvedValue([]);
    (apiFetch as jest.Mock).mockResolvedValue([]);
    (execute as jest.Mock).mockResolvedValue(undefined);

    await Promise.all([sync('p1'), sync('p1')]);
    expect(apiFetch).toHaveBeenCalledTimes(Object.keys(require('../../src/database/schema').ENTITY_PK_MAP).length);
  });
});
