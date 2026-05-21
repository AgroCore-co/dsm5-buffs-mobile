import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { syncService } from '../services/syncService';
import { colors } from '../styles/colors';

interface Props {
  propriedadeId: string;
  onSyncComplete: () => void;
}

type SyncState = 'syncing' | 'error' | 'done';

const CORE_TOTAL = 3;

export function InitialSyncScreen({ propriedadeId, onSyncComplete }: Props) {
  const [state, setState] = useState<SyncState>('syncing');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const hasRun = useRef(false);
  const navigated = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const animateTo = (value: number) => {
    Animated.timing(progressAnim, {
      toValue: value,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const runSync = async () => {
    setState('syncing');
    setError(null);
    setDone(0);
    navigated.current = false;
    animateTo(0);

    try {
      await syncService.syncCore(propriedadeId, (d, total) => {
        setDone(d);
        animateTo(d / total);
        if (d >= total && !navigated.current) {
          navigated.current = true;
          setState('done');
          onSyncComplete();
          // full sync continues in background via SyncContext
        }
      });
      if (!navigated.current) {
        navigated.current = true;
        setState('done');
        onSyncComplete();
      }
    } catch (err: any) {
      setState('error');
      setError(err?.message ?? 'Erro desconhecido');
    }
  };

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      runSync();
    }
  }, []);

  if (state === 'done') return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Preparando o app</Text>

      {state === 'syncing' && (
        <>
          <Text style={styles.subtitle}>
            Baixando dados essenciais ({done}/{CORE_TOTAL})…
          </Text>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.hint}>
            O app abre automaticamente assim que os dados principais chegarem.
          </Text>
        </>
      )}

      {state === 'error' && (
        <>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={runSync}>
            <Text style={styles.buttonText}>Tentar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.offlineButton} onPress={onSyncComplete}>
            <Text style={styles.offlineText}>Continuar offline</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.brown.base,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray.base,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.gray.inactive ?? '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.yellow.dark,
    borderRadius: 4,
  },
  hint: {
    fontSize: 12,
    color: colors.gray.base,
    textAlign: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: colors.red.base,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.yellow.dark,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brown.base,
  },
  offlineButton: {
    paddingVertical: 8,
  },
  offlineText: {
    fontSize: 14,
    color: colors.gray.base,
    textDecorationLine: 'underline',
  },
});
