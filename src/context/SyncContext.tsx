import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { syncService } from '../services/syncService';
import {
  getPendingCount, getFailedCount, getFailedOperations, PendingOperation,
} from '../services/pendingOperationsService';
import { usePropriedade } from './PropriedadeContext';
import { isFirstSync } from '../database/db';
import {
  notifyDownload, notifySync, notifyUpload, notifyDone, cancelNotification,
  NOTIF_ID_DOWNLOAD, NOTIF_ID_SYNC, NOTIF_ID_UPLOAD,
} from '../services/notificationService';

export interface SyncContextValue {
  isSyncing: boolean;
  isDownloading: boolean;
  downloadProgress: number;    // 0–1
  downloadFailed: boolean;
  isFirstSyncNeeded: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  hasFailed: boolean;
  failedOperations: PendingOperation[];
  sync: () => void;
  triggerDownload: (propertyName?: string) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  isSyncing: false,
  isDownloading: false,
  downloadProgress: 0,
  downloadFailed: false,
  isFirstSyncNeeded: false,
  lastSyncedAt: null,
  pendingCount: 0,
  hasFailed: false,
  failedOperations: [],
  sync: () => {},
  triggerDownload: async () => {},
});

interface SyncProviderProps {
  children: React.ReactNode;
  propriedadeId?: string;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({
  children,
  propriedadeId: propPropId,
}) => {
  const { propriedadeSelecionada } = usePropriedade();
  const propriedadeId = propPropId || propriedadeSelecionada;

  const [isSyncing, setIsSyncing]                 = useState(false);
  const [isDownloading, setIsDownloading]         = useState(false);
  const [downloadProgress, setDownloadProgress]   = useState(0);
  const [downloadFailed, setDownloadFailed]       = useState(false);
  const [isFirstSyncNeeded, setIsFirstSyncNeeded] = useState(false);
  const [lastSyncedAt, setLastSyncedAt]           = useState<string | null>(null);
  const [pendingCount, setPendingCount]           = useState(0);
  const [hasFailed, setHasFailed]                 = useState(false);
  const [failedOperations, setFailedOperations]   = useState<PendingOperation[]>([]);

  const isSyncingRef     = useRef(false);
  const isDownloadingRef = useRef(false);
  const isFirstSyncNeededRef = useRef(false);

  const refreshCounts = useCallback(async () => {
    const pending   = await getPendingCount();
    const failed    = await getFailedCount();
    const failedOps = failed > 0 ? await getFailedOperations() : [];
    setPendingCount(pending);
    setHasFailed(failed > 0);
    setFailedOperations(failedOps);
  }, []);

  // Mantém o ref em sincronia com o state (lido dentro de sync())
  useEffect(() => { isFirstSyncNeededRef.current = isFirstSyncNeeded; }, [isFirstSyncNeeded]);

  // Verifica se a propriedade selecionada precisa de download inicial
  useEffect(() => {
    if (!propriedadeId) {
      setIsFirstSyncNeeded(false);
      return;
    }
    isFirstSync(propriedadeId).then(setIsFirstSyncNeeded);
  }, [propriedadeId]);

  /**
   * Download inicial explícito — disparado pelo botão na HomeScreen.
   * Usa syncCore (entidades core) e reporta progresso (0–3 etapas).
   */
  const triggerDownload = useCallback(async (propertyName = 'propriedade') => {
    if (!propriedadeId || isDownloadingRef.current || isSyncingRef.current) return;

    isDownloadingRef.current = true;
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadFailed(false);

    try {
      await notifyDownload(0, 3, propertyName);

      await syncService.syncCore(propriedadeId, async (done, total) => {
        const progress = done / total;
        setDownloadProgress(progress);
        await notifyDownload(done, total, propertyName);
      });

      setDownloadProgress(1);
      setIsFirstSyncNeeded(false);
      setLastSyncedAt(new Date().toISOString());
      await notifyDone(NOTIF_ID_DOWNLOAD);
      await refreshCounts();
    } catch {
      setDownloadFailed(true);
      await cancelNotification(NOTIF_ID_DOWNLOAD);
    } finally {
      isDownloadingRef.current = false;
      setIsDownloading(false);
      // Reseta progresso após 2.5 s (tempo para barra "concluído" ser exibida)
      setTimeout(() => {
        setDownloadProgress(0);
        setDownloadFailed(false);
      }, 2500);
    }
  }, [propriedadeId, refreshCounts]);

  /**
   * Sync incremental — disparado automaticamente (foreground, rede, 5 min).
   * Não bloqueia UI, emite notificações discretas.
   */
  const sync = useCallback(async () => {
    if (!propriedadeId || isSyncingRef.current || isDownloadingRef.current) return;
    // Não sincroniza automaticamente antes do download inicial manual
    if (isFirstSyncNeededRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const pending = await getPendingCount();
      if (pending > 0) await notifyUpload(0, pending);
      await notifySync();

      await syncService.sync(propriedadeId);

      setLastSyncedAt(new Date().toISOString());
      await refreshCounts();
      await notifyDone(NOTIF_ID_SYNC);
      await cancelNotification(NOTIF_ID_UPLOAD);
    } catch {
      await cancelNotification(NOTIF_ID_SYNC);
      await cancelNotification(NOTIF_ID_UPLOAD);
      setHasFailed(true);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [propriedadeId, refreshCounts]);

  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  // Gatilho 1 — app volta ao foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') sync();
    });
    return () => sub.remove();
  }, [sync]);

  // Gatilho 2 — rede reconectada
  useEffect(() => {
    return NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) sync();
    });
  }, [sync]);

  // Gatilho 3 — intervalo de 5 min
  useEffect(() => {
    const t = setInterval(sync, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [sync]);

  return (
    <SyncContext.Provider value={{
      isSyncing, isDownloading, downloadProgress, downloadFailed,
      isFirstSyncNeeded, lastSyncedAt, pendingCount, hasFailed,
      failedOperations, sync, triggerDownload,
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncStatus = () => useContext(SyncContext);
