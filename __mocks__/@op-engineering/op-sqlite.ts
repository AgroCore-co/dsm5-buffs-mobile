let _mockRows: any[] = [];

export const __setMockRows = (rows: any[]) => { _mockRows = rows; };
export const __clearMocks = () => { _mockRows = []; };

const mockDb = {
  executeAsync: jest.fn(async () => ({ rows: { _array: _mockRows } })),
};

export const open = jest.fn(() => mockDb);
export const __mockDb = mockDb;
