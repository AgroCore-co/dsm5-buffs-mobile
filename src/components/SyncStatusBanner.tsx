import React, { useEffect, useRef } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSyncStatus } from '../context/SyncContext';
import { colors } from '../styles/colors';

export function SyncStatusBanner() {
  const { isSyncing, pendingCount, hasFailed, failedOperations, sync: triggerSync } = useSyncStatus();

  const showFailedDetails = () => {
    if (!failedOperations.length) {
      Alert.alert('Falhas de Sync', 'Nenhum detalhe disponível.');
      return;
    }
    const details = failedOperations.map((op, i) =>
      `${i + 1}. [${op.entity}] ${op.operation} → ${op.endpoint}\n   Erro: ${op.errorMessage ?? 'desconhecido'}`
    ).join('\n\n');
    Alert.alert('Operações com Falha', details, [
      { text: 'Tentar novamente', onPress: triggerSync },
      { text: 'Fechar', style: 'cancel' },
    ]);
  };

  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isSyncing) {
      shimmer.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isSyncing]);

  if (!isSyncing && pendingCount === 0 && !hasFailed) return null;

  const bgColor = hasFailed ? colors.red.inactive : colors.yellow.warning;
  const textColor = hasFailed ? colors.red.text : colors.brown.base;

  let message = '';
  if (isSyncing) message = 'Sincronizando dados…';
  else if (hasFailed) message = `${failedOperations.length} operação(ões) com falha. Toque para detalhes.`;
  else if (pendingCount > 0) message = `${pendingCount} operação(ões) aguardando sync.`;

  const barLeft = shimmer.interpolate({ inputRange: [0, 1], outputRange: ['-35%', '100%'] });

  return (
    <View style={[styles.wrapper, { backgroundColor: bgColor }]}>
      <View style={styles.row}>
        <TouchableOpacity onPress={hasFailed ? showFailedDetails : undefined} disabled={!hasFailed} style={{ flex: 1 }}>
          <Text style={[styles.text, { color: textColor }]}>{message}</Text>
        </TouchableOpacity>
        {!isSyncing && pendingCount > 0 && (
          <TouchableOpacity onPress={triggerSync} style={styles.button}>
            <Text style={[styles.buttonText, { color: textColor }]}>Sincronizar agora</Text>
          </TouchableOpacity>
        )}
      </View>
      {isSyncing && (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { left: barLeft }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  button: {
    marginLeft: 12,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    width: '35%',
    height: '100%',
    backgroundColor: colors.brown.base,
    borderRadius: 2,
    opacity: 0.7,
  },
});
