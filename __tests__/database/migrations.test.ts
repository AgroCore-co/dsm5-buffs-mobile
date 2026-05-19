import { open } from '@op-engineering/op-sqlite';
import { runMigrations } from '../../src/database/migrations';
import { CREATE_TABLES_SQL } from '../../src/database/schema';

const mockExecute = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  (open as jest.Mock).mockReturnValue({ execute: mockExecute });
});

describe('runMigrations', () => {
  it('creates tables when user_version is 0', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ user_version: 0 }] })
      .mockResolvedValue({ rows: [] });

    await runMigrations();

    expect(mockExecute).toHaveBeenCalledWith('PRAGMA user_version');
    CREATE_TABLES_SQL.forEach((sql) => {
      expect(mockExecute).toHaveBeenCalledWith(sql);
    });
    expect(mockExecute).toHaveBeenCalledWith('PRAGMA user_version = 1');
  });

  it('skips migrations when user_version is current', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ user_version: 1 }] });

    await runMigrations();

    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
