import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { syncService } from '../services/syncService';
import { getPendingCount, getFailedCount } from '../services/pendingOperationsService';
import { usePropriedade } from './PropriedadeContext';

interface SyncContextValue {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  hasFailed: boolean;
  sync: () => void;
}

const SyncContext = createContext<SyncContextValue>({
  isSyncing: false,
  lastSyncedAt: null,
  pendingCount: 0,
  hasFailed: false,
  sync: () => {},
});

interface SyncProviderProps {
  children: React.ReactNode;
  propriedadeId?: string;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children, propriedadeId: propPropId }) => {
  const { propriedadeSelecionada } = usePropriedade();
  const propriedadeId = propPropId || propriedadeSelecionada;
  
  const [isSyncing, setIsSyncing]       = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasFailed, setHasFailed]       = useState(false);
  const isSyncingRef = useRef(false);

  const refreshCounts = useCallback(async () => {
    const pending = await getPendingCount();
    const failed  = await getFailedCount();
    setPendingCount(pending);
    setHasFailed(failed > 0);
  }, []);

  const sync = useCallback(async () => {
    if (!propriedadeId || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      await syncService.sync(propriedadeId);
      setLastSyncedAt(new Date().toISOString());
      await refreshCounts();
    } catch {
      setHasFailed(true);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [propriedadeId, refreshCounts]);

  // Carrega contagens iniciais sem disparar sync completo
  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  // Gatilho 1 — app volta ao foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') sync(); });
    return () => sub.remove();
  }, [sync]);

  // Gatilho 2 — rede reconectada
  useEffect(() => {
    return NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) sync();
    });
  }, [sync]);

  // Gatilho 3 — intervalo de 5 min em foreground
  useEffect(() => {
    const t = setInterval(sync, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [sync]);

  return (
    <SyncContext.Provider value={{ isSyncing, lastSyncedAt, pendingCount, hasFailed, sync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncStatus = () => useContext(SyncContext);
