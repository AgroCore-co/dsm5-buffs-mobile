import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../styles/colors';
import { useSyncStatus } from '../../context/SyncContext';

// ─────────────────────────────────────────────────────────────
// DownloadButton
// Botão circular posicionado ao lado do SelectPropriedade.
// Estados visuais:
//   ⬇  pulsando  — sem dados locais (isFirstSyncNeeded)
//   ↻  girando   — download ou sync em andamento
//   ✓  discreto  — dados sincronizados
// ─────────────────────────────────────────────────────────────
interface DownloadButtonProps {
  /** Nome da propriedade exibido na notificação Android */
  propertyName?: string;
}

export function DownloadButton({ propertyName }: DownloadButtonProps) {
  const { isFirstSyncNeeded, isDownloading, isSyncing, triggerDownload } = useSyncStatus();

  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Pulsa quando precisa de download inicial e está ocioso
  useEffect(() => {
    if (!isFirstSyncNeeded || isDownloading || isSyncing) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18, duration: 700,
          useNativeDriver: true, easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1, duration: 700,
          useNativeDriver: true, easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isFirstSyncNeeded, isDownloading, isSyncing]);

  // Rotaciona quando está ativo
  useEffect(() => {
    if (!isDownloading && !isSyncing) {
      rotateAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1, duration: 900,
        useNativeDriver: true, easing: Easing.linear,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [isDownloading, isSyncing]);

  const isActive = isDownloading || isSyncing;
  const rotate   = rotateAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg'],
  });

  const icon = isActive ? '↻' : isFirstSyncNeeded ? '⬇' : '✓';
  const bg   = isFirstSyncNeeded && !isActive ? colors.brand.primary : colors.bg.section;

  return (
    <Animated.View
      style={{
        transform: [{ scale: isFirstSyncNeeded && !isActive ? pulseAnim : 1 }],
        alignSelf: 'flex-start',
        marginTop: 34, // alinha verticalmente com o SelectBottomSheet dentro do card
      }}
    >
      <TouchableOpacity
        style={[styles.button, { backgroundColor: bg }]}
        onPress={() => !isActive && triggerDownload(propertyName)}
        activeOpacity={0.8}
        accessibilityLabel={
          isActive
            ? 'Sincronizando...'
            : isFirstSyncNeeded
              ? 'Baixar dados da propriedade'
              : 'Sincronizar dados'
        }
      >
        <Animated.Text style={[styles.icon, isActive && { transform: [{ rotate }] }]}>
          {icon}
        </Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// SyncProgressBar
// Barra inline abaixo do seletor de propriedade.
// Aparece durante download/sync, some 2.5 s após concluir.
// Em erro: fica vermelha e permite retry ao tocar.
// ─────────────────────────────────────────────────────────────
interface SyncProgressBarProps {
  onRetry?: () => void;
}

export function SyncProgressBar({ onRetry }: SyncProgressBarProps) {
  const { isDownloading, isSyncing, downloadProgress, downloadFailed } = useSyncStatus();

  const widthAnim   = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const [isDone, setIsDone]   = useState(false);
  const wasDownloading        = useRef(false);

  // Mostra quando qualquer operação inicia
  useEffect(() => {
    if (isDownloading || isSyncing) {
      setVisible(true);
      setIsDone(false);
    }
  }, [isDownloading, isSyncing]);

  // Detecta conclusão do download (transição true → false sem erro)
  useEffect(() => {
    if (wasDownloading.current && !isDownloading && !downloadFailed) {
      setIsDone(true);
      const t = setTimeout(() => {
        setVisible(false);
        setIsDone(false);
      }, 2500);
      return () => clearTimeout(t);
    }
    wasDownloading.current = isDownloading;
  }, [isDownloading, downloadFailed]);

  // Anima barra de progresso determinística (download)
  useEffect(() => {
    if (!isDownloading) return;
    Animated.timing(widthAnim, {
      toValue: downloadProgress,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [downloadProgress, isDownloading]);

  // Shimmer para sync indeterminado
  useEffect(() => {
    if (!isSyncing) { shimmerAnim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0,    useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isSyncing]);

  if (!visible) return null;

  const progressWidth = widthAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });
  const shimmerLeft = shimmerAnim.interpolate({
    inputRange: [0, 1], outputRange: ['-35%', '110%'],
  });

  const isError = downloadFailed;

  const label = isDone
    ? '✓ Concluído'
    : isError
      ? '⚠ Falha — Toque para tentar novamente'
      : isDownloading
        ? `Baixando dados... ${Math.round(downloadProgress * 100)}%`
        : 'Sincronizando...';

  const containerBg = isDone
    ? colors.status.successBg
    : isError
      ? colors.status.errorBg
      : colors.bg.section;

  const labelColor = isDone
    ? colors.status.success
    : isError
      ? colors.status.error
      : colors.text.muted;

  const fillColor = isDone || isError ? 'transparent' : colors.brand.primary;

  return (
    <TouchableOpacity
      style={[styles.barContainer, { backgroundColor: containerBg }]}
      onPress={isError ? onRetry : undefined}
      disabled={!isError}
      activeOpacity={0.8}
    >
      <Text style={[styles.barLabel, { color: labelColor }]}>{label}</Text>

      {!isDone && !isError && (
        <View style={styles.track}>
          {isDownloading ? (
            // Barra determinística (download)
            <Animated.View
              style={[styles.fill, { width: progressWidth, backgroundColor: fillColor }]}
            />
          ) : (
            // Shimmer indeterminado (sync)
            <Animated.View
              style={[styles.fill, styles.shimmer, { left: shimmerLeft, backgroundColor: fillColor }]}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  icon: {
    fontSize: 22,
    color: colors.text.accent,
    fontWeight: '600',
  },
  barContainer: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 6,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 3,
  },
  shimmer: {
    width: '35%',
  },
});
