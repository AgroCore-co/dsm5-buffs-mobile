/**
 * useNfcScan
 *
 * Hook para leitura de UMA tag NFC (single-shot, não contínuo).
 * Retorna o ID da tag em hexadecimal maiúsculo, ou null se cancelado/erro.
 *
 * Uso típico em formulários:
 *   const { scan, scanning } = useNfcScan();
 *   const microchip = await scan(); // aguarda usuário aproximar o brinco
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export function useNfcScan() {
  const [scanning, setScanning] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Garante que não deixa requisição pendente ao desmontar
      try { NfcManager.cancelTechnologyRequest(); } catch {}
    };
  }, []);

  /**
   * Lê uma única tag NFC e retorna o ID (hex maiúsculo).
   * Retorna null se o NFC não está disponível, a leitura foi cancelada ou houve erro.
   */
  const scan = useCallback(async (): Promise<string | null> => {
    if (!mountedRef.current) return null;
    setScanning(true);
    try {
      await NfcManager.start();
      const supported = await NfcManager.isSupported();
      const enabled   = await NfcManager.isEnabled();
      if (!supported || !enabled) return null;

      await NfcManager.requestTechnology(NfcTech.NfcA);
      const tag = await NfcManager.getTag();
      await NfcManager.cancelTechnologyRequest();

      return tag?.id?.toUpperCase() ?? null;
    } catch {
      try { await NfcManager.cancelTechnologyRequest(); } catch {}
      return null;
    } finally {
      if (mountedRef.current) setScanning(false);
    }
  }, []);

  /** Cancela uma leitura em andamento. */
  const cancel = useCallback(() => {
    try { NfcManager.cancelTechnologyRequest(); } catch {}
    if (mountedRef.current) setScanning(false);
  }, []);

  return { scan, cancel, scanning };
}
