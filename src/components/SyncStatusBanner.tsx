import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSyncStatus } from '../context/SyncContext';
import { colors } from '../styles/colors';

export function SyncStatusBanner() {
  const { isSyncing, pendingCount, hasFailed: failedCount, sync: triggerSync } = useSyncStatus();

  if (!isSyncing && pendingCount === 0 && !failedCount) return null;

  const bgColor = failedCount ? colors.red.inactive : colors.yellow.warning;
  const textColor = failedCount ? colors.red.text : colors.brown.base;

  let message = '';
  if (isSyncing) {
    message = 'Sincronizando...';
  } else if (failedCount) {
    message = 'Operações com falha. Toque para tentar novamente.';
  } else if (pendingCount > 0) {
    message = `${pendingCount} operação(ões) aguardando sync.`;
  }

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>
      {!isSyncing && pendingCount > 0 && (
        <TouchableOpacity onPress={triggerSync} style={styles.button}>
          <Text style={[styles.buttonText, { color: textColor }]}>Sincronizar agora</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
});
