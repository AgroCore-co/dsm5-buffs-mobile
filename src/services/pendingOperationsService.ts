import uuid from 'react-native-uuid';
import { queryAll, queryFirst, execute } from '../database/db';

export type PendingOperation = {
  id: string;
  entity: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string;
  retryCount: number;
  createdAt: string;
};

const MAX_RETRIES = 5;

export async function enqueue(
  entity: string,
  operation: PendingOperation['operation'],
  payload: object,
): Promise<void> {
  const id = uuid.v4() as string;
  const createdAt = new Date().toISOString();
  await execute(
    `INSERT INTO pending_operations (id, entity, operation, payload, retryCount, createdAt)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [id, entity, operation, JSON.stringify(payload), createdAt],
  );
}

export async function getPending(): Promise<PendingOperation[]> {
  return queryAll<PendingOperation>(
    `SELECT * FROM pending_operations WHERE retryCount < ? ORDER BY createdAt ASC`,
    [MAX_RETRIES],
  );
}

export async function markSynced(id: string): Promise<void> {
  await execute(`DELETE FROM pending_operations WHERE id = ?`, [id]);
}

export async function incrementRetry(id: string): Promise<void> {
  await execute(
    `UPDATE pending_operations SET retryCount = retryCount + 1 WHERE id = ?`,
    [id],
  );
}

export async function getPendingCount(): Promise<number> {
  const row = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_operations WHERE retryCount < ?`,
    [MAX_RETRIES],
  );
  return row?.count ?? 0;
}

export async function getFailedCount(): Promise<number> {
  const row = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_operations WHERE retryCount >= ?`,
    [MAX_RETRIES],
  );
  return row?.count ?? 0;
}
