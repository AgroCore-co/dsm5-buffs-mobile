import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { syncService } from '../services/syncService';
import { colors } from '../styles/colors';

interface Props {
  propriedadeId: string;
  onSyncComplete: () => void;
}

type SyncState = 'syncing' | 'error' | 'done';

export function InitialSyncScreen({ propriedadeId, onSyncComplete }: Props) {
  const [state, setState] = useState<SyncState>('syncing');
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  const runSync = async () => {
    setState('syncing');
    setError(null);
    try {
      await syncService.sync(propriedadeId);
      setState('done');
      onSyncComplete();
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sincronizando dados</Text>

      {state === 'syncing' && (
        <>
          <ActivityIndicator size="large" color={colors.yellow.dark} style={styles.spinner} />
          <Text style={styles.subtitle}>Aguarde, baixando dados da propriedade...</Text>
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
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.brown.base,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray.base,
    textAlign: 'center',
    marginTop: 12,
  },
  spinner: {
    marginTop: 8,
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
