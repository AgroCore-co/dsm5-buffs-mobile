import uuid from 'react-native-uuid';
import { execute, queryAll, queryFirst } from '../database/db';
import { resolvePushEndpoint } from './sync/pushEndpoints';

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface PendingOperation {
  id: string;
  entity: string;
  operation: OperationType;
  endpoint: string;
  method: string;
  payload: string;
  status: 'PENDING' | 'FAILED';
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
}

export async function enqueue(entity: string, operation: OperationType, payload: object): Promise<void> {
  const { endpoint, method, body } = resolvePushEndpoint(entity, operation, payload);
  await execute(
    `INSERT INTO pending_operations
      (id, entity, operation, endpoint, method, payload, status, retryCount, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?)`,
    [
      String(uuid.v4()),
      entity,
      operation,
      endpoint,
      method,
      JSON.stringify(body ?? payload),
      new Date().toISOString(),
    ]
  );
}

export async function getPending(): Promise<PendingOperation[]> {
  return queryAll<PendingOperation>(
    'SELECT * FROM pending_operations WHERE retryCount < ? ORDER BY createdAt ASC',
    [5]
  );
}

export async function markSynced(id: string): Promise<void> {
  await execute('DELETE FROM pending_operations WHERE id = ?', [id]);
}

export async function incrementRetry(id: string): Promise<void> {
  await execute(
    'UPDATE pending_operations SET retryCount = retryCount + 1 WHERE id = ?',
    [id]
  );
}

export async function getPendingCount(): Promise<number> {
  const row = await queryFirst<{ count: number }>(
    "SELECT COUNT(*) as count FROM pending_operations WHERE retryCount < 5"
  );
  return row?.count ?? 0;
}

export async function getFailedCount(): Promise<number> {
  const row = await queryFirst<{ count: number }>(
    "SELECT COUNT(*) as count FROM pending_operations WHERE retryCount >= 5"
  );
  return row?.count ?? 0;
}

// Backward-compat object export for SyncContext / SyncService that use object form
export const pendingOperationsService = {
  enqueue,
  getPending,
  markSynced,
  incrementRetry,
  getPendingCount,
  getFailedCount,
};
