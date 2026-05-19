import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSync } from '../context/SyncContext';
import { colors } from '../styles/colors';

export function SyncStatusBanner() {
  const { isSyncing, pendingCount, failedCount, triggerSync } = useSync();

  if (!isSyncing && pendingCount === 0 && failedCount === 0) return null;

  const bgColor = failedCount > 0 ? colors.red.inactive : colors.yellow.warning;
  const textColor = failedCount > 0 ? colors.red.text : colors.brown.base;

  let message = '';
  if (isSyncing) {
    message = 'Sincronizando...';
  } else if (failedCount > 0) {
    message = `${failedCount} operação(ões) falharam.`;
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
