import { open } from '@op-engineering/op-sqlite';
import { queryAll, queryFirst, execute, isFirstSync } from '../../src/database/db';

const mockExecute = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (open as jest.Mock).mockReturnValue({ execute: mockExecute });
});

describe('queryAll', () => {
  it('returns rows from execute result', async () => {
    mockExecute.mockResolvedValue({ rows: [{ id: '1' }] });
    const result = await queryAll('SELECT * FROM bufalos');
    expect(result).toEqual([{ id: '1' }]);
  });

  it('returns empty array when rows is empty', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const result = await queryAll('SELECT * FROM bufalos');
    expect(result).toEqual([]);
  });
});

describe('queryFirst', () => {
  it('returns first row', async () => {
    mockExecute.mockResolvedValue({ rows: [{ id: '1' }, { id: '2' }] });
    const result = await queryFirst('SELECT * FROM bufalos');
    expect(result).toEqual({ id: '1' });
  });

  it('returns null when no rows', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const result = await queryFirst('SELECT * FROM bufalos');
    expect(result).toBeNull();
  });
});

describe('execute', () => {
  it('calls db.execute with sql and params', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    await execute('INSERT INTO bufalos (id) VALUES (?)', ['abc']);
    expect(mockExecute).toHaveBeenCalledWith('INSERT INTO bufalos (id) VALUES (?)', ['abc']);
  });
});

describe('isFirstSync', () => {
  it('returns true when no sync_meta row exists', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const result = await isFirstSync('prop-1');
    expect(result).toBe(true);
  });

  it('returns true when lastSyncedAt is null', async () => {
    mockExecute.mockResolvedValue({ rows: [{ lastSyncedAt: null }] });
    const result = await isFirstSync('prop-1');
    expect(result).toBe(true);
  });

  it('returns false when lastSyncedAt has a value', async () => {
    mockExecute.mockResolvedValue({ rows: [{ lastSyncedAt: '2026-01-01T00:00:00Z' }] });
    const result = await isFirstSync('prop-1');
    expect(result).toBe(false);
  });
});
