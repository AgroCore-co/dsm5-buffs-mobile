import uuid from 'react-native-uuid';
import { execute, queryAll } from '../database/db';

export interface PendingOperation {
  id: string;
  entity: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  method: string;
  payload: string;
  status: 'PENDING' | 'FAILED';
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
}

interface EnqueueParams {
  entity: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  method: string;
  payload: string;
}

export const pendingOperationsService = {
  async enqueue(params: EnqueueParams): Promise<void> {
    await execute(
      `INSERT INTO pending_operations
        (id, entity, operation, endpoint, method, payload, status, retryCount, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?)`,
      [
        String(uuid.v4()),
        params.entity,
        params.operation,
        params.endpoint,
        params.method,
        params.payload,
        new Date().toISOString(),
      ]
    );
  },

  async getPending(): Promise<PendingOperation[]> {
    return queryAll<PendingOperation>(
      "SELECT * FROM pending_operations WHERE status = 'PENDING' ORDER BY createdAt ASC",
      []
    );
  },

  async markSynced(id: string): Promise<void> {
    await execute('DELETE FROM pending_operations WHERE id = ?', [id]);
  },

  async incrementRetry(id: string, currentCount: number, errorMessage: string): Promise<void> {
    const newCount = currentCount + 1;
    const newStatus = newCount >= 3 ? 'FAILED' : 'PENDING';
    await execute(
      'UPDATE pending_operations SET retryCount = ?, status = ?, errorMessage = ? WHERE id = ?',
      [newCount, newStatus, errorMessage, id]
    );
  },

  async getFailedCount(): Promise<number> {
    const row = await queryAll<{ count: number }>(
      "SELECT COUNT(*) as count FROM pending_operations WHERE status = 'FAILED'",
      []
    );
    return row[0]?.count ?? 0;
  },

  async getPendingCount(): Promise<number> {
    const row = await queryAll<{ count: number }>(
      "SELECT COUNT(*) as count FROM pending_operations WHERE status = 'PENDING'",
      []
    );
    return row[0]?.count ?? 0;
  },
};
