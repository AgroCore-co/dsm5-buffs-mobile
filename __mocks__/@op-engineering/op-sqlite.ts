const mockDb = {
  execute: jest.fn().mockResolvedValue({ rows: [], rowsAffected: 0 }),
  executeBatch: jest.fn().mockResolvedValue({ rowsAffected: 0 }),
  close: jest.fn(),
};

export const open = jest.fn().mockReturnValue(mockDb);
export const OPSQLiteConnection = jest.fn();
