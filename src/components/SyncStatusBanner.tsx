import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSyncStatus } from '../context/SyncContext';
import { colors } from '../styles/colors';

export function SyncStatusBanner() {
  const { isSyncing, pendingCount, hasFailed, sync: triggerSync } = useSyncStatus();

  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isSyncing) {
      shimmer.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
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
  else if (hasFailed) message = 'Operações com falha. Toque para tentar novamente.';
  else if (pendingCount > 0) message = `${pendingCount} operação(ões) aguardando sync.`;

  const progressWidth = shimmer.interpolate({ inputRange: [0, 1], outputRange: ['30%', '85%'] });

  return (
    <View style={[styles.wrapper, { backgroundColor: bgColor }]}>
      <View style={styles.row}>
        <Text style={[styles.text, { color: textColor }]}>{message}</Text>
        {!isSyncing && pendingCount > 0 && (
          <TouchableOpacity onPress={triggerSync} style={styles.button}>
            <Text style={[styles.buttonText, { color: textColor }]}>Sincronizar agora</Text>
          </TouchableOpacity>
        )}
      </View>
      {isSyncing && (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
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
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brown.base,
    borderRadius: 2,
    opacity: 0.6,
  },
});
