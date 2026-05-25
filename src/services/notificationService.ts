import notifee, {
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';

// ── IDs de notificação (exportados para uso em SyncContext) ──
export const NOTIF_ID_DOWNLOAD = 'buffs-download';
export const NOTIF_ID_SYNC     = 'buffs-sync';
export const NOTIF_ID_UPLOAD   = 'buffs-upload';

// ── IDs de canal Android ──
const CHANNEL_DOWNLOAD = 'buffs_download';
const CHANNEL_SYNC     = 'buffs_sync';
const CHANNEL_UPLOAD   = 'buffs_upload';

/**
 * Cria os 3 canais Android e solicita permissão (Android 13+).
 * Chamar uma vez no boot do app, após runMigrations().
 * Idempotente — seguro chamar múltiplas vezes.
 */
export async function createNotificationChannels(): Promise<void> {
  try {
    await notifee.requestPermission();
    await notifee.createChannel({
      id: CHANNEL_DOWNLOAD,
      name: 'Download de Dados',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
    });
    await notifee.createChannel({
      id: CHANNEL_SYNC,
      name: 'Sincronização',
      importance: AndroidImportance.LOW,
      visibility: AndroidVisibility.PUBLIC,
    });
    await notifee.createChannel({
      id: CHANNEL_UPLOAD,
      name: 'Envio de Pendências',
      importance: AndroidImportance.LOW,
      visibility: AndroidVisibility.PUBLIC,
    });
  } catch {
    // notificações são best-effort — nunca travar o app
  }
}

/**
 * Exibe/atualiza notificação de download com barra de progresso determinística.
 * @param current  etapas concluídas
 * @param max      total de etapas
 * @param propName nome da propriedade exibido no título
 */
export async function notifyDownload(
  current: number,
  max: number,
  propName = 'propriedade',
): Promise<void> {
  try {
    const pct = max > 0 ? Math.round((current / max) * 100) : 0;
    await notifee.displayNotification({
      id: NOTIF_ID_DOWNLOAD,
      title: `BUFFS — Baixando ${propName}`,
      body: `${pct}% concluído`,
      android: {
        channelId: CHANNEL_DOWNLOAD,
        ongoing: true,
        progress: { max, current, indeterminate: false },
      },
    });
  } catch { /* best-effort */ }
}

/**
 * Exibe/atualiza notificação de sync incremental (barra indeterminada).
 */
export async function notifySync(): Promise<void> {
  try {
    await notifee.displayNotification({
      id: NOTIF_ID_SYNC,
      title: 'BUFFS — Sincronizando',
      body: 'Atualizando dados locais...',
      android: {
        channelId: CHANNEL_SYNC,
        ongoing: true,
        progress: { max: 0, current: 0, indeterminate: true },
      },
    });
  } catch { /* best-effort */ }
}

/**
 * Exibe/atualiza notificação de envio de operações pendentes.
 * Não exibe se max === 0.
 */
export async function notifyUpload(current: number, max: number): Promise<void> {
  if (max === 0) return;
  try {
    await notifee.displayNotification({
      id: NOTIF_ID_UPLOAD,
      title: 'BUFFS — Enviando dados',
      body: `${current} de ${max} operações enviadas`,
      android: {
        channelId: CHANNEL_UPLOAD,
        ongoing: true,
        progress: { max, current, indeterminate: false },
      },
    });
  } catch { /* best-effort */ }
}

/**
 * Atualiza notificação para "concluído" e cancela após 3 s.
 */
export async function notifyDone(notifId: string): Promise<void> {
  const titleMap: Record<string, string> = {
    [NOTIF_ID_DOWNLOAD]: 'BUFFS — Download concluído ✓',
    [NOTIF_ID_SYNC]:     'BUFFS — Sincronizado ✓',
    [NOTIF_ID_UPLOAD]:   'BUFFS — Envio concluído ✓',
  };
  const channelMap: Record<string, string> = {
    [NOTIF_ID_DOWNLOAD]: CHANNEL_DOWNLOAD,
    [NOTIF_ID_SYNC]:     CHANNEL_SYNC,
    [NOTIF_ID_UPLOAD]:   CHANNEL_UPLOAD,
  };
  try {
    await notifee.displayNotification({
      id: notifId,
      title: titleMap[notifId] ?? 'BUFFS — Concluído ✓',
      body: '',
      android: {
        channelId: channelMap[notifId] ?? CHANNEL_SYNC,
        ongoing: false,
        progress: { max: 100, current: 100, indeterminate: false },
      },
    });
    setTimeout(() => notifee.cancelNotification(notifId).catch(() => {}), 3000);
  } catch { /* best-effort */ }
}

/**
 * Cancela uma notificação imediatamente.
 */
export async function cancelNotification(notifId: string): Promise<void> {
  try {
    await notifee.cancelNotification(notifId);
  } catch { /* best-effort */ }
}
