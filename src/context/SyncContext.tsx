import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { sync } from '../services/syncService';
import { getPendingCount, getFailedCount } from '../services/pendingOperationsService';

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

interface SyncContextData {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  pendingCount: number;
  failedCount: number;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextData>({} as SyncContextData);

export const SyncProvider: React.FC<{ propriedadeId: string | null; children: React.ReactNode }> = ({
  propriedadeId,
  children,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshCounts = useCallback(async () => {
    const [pending, failed] = await Promise.all([getPendingCount(), getFailedCount()]);
    setPendingCount(pending);
    setFailedCount(failed);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!propriedadeId || isSyncing) return;
    setIsSyncing(true);
    try {
      await sync(propriedadeId);
      setLastSyncedAt(new Date());
      await refreshCounts();
    } finally {
      setIsSyncing(false);
    }
  }, [propriedadeId, isSyncing, refreshCounts]);

  // Trigger 1: foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        triggerSync();
      }
    });
    return () => subscription.remove();
  }, [triggerSync]);

  // Trigger 2: reconnect
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        triggerSync();
      }
    });
    return () => unsubscribe();
  }, [triggerSync]);

  // Trigger 3: interval
  useEffect(() => {
    intervalRef.current = setInterval(triggerSync, SYNC_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [triggerSync]);

  // Trigger 4: on propriedadeId change (also covers initial mount)
  useEffect(() => {
    if (propriedadeId) {
      triggerSync();
      refreshCounts();
    }
  }, [propriedadeId]);

  return (
    <SyncContext.Provider value={{ isSyncing, lastSyncedAt, pendingCount, failedCount, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
