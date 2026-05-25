/**
 * NfcBrincoButton
 *
 * Botão de leitura RFID para campos de brinco/microchip em formulários.
 *
 * Modos:
 *   'microchip' → preenche com o ID bruto da tag NFC (hex uppercase)
 *   'brinco'    → lê a tag, busca o animal no SQLite pelo microchip,
 *                 preenche com o brinco do animal
 *
 * Exemplo de uso:
 *   // Campo microchip
 *   <NfcBrincoButton mode="microchip" onResult={setMicrochip} />
 *
 *   // Campo brinco do pai (macho)
 *   <NfcBrincoButton mode="brinco" sexo="M" propriedadeId={propId} onResult={setBrincoPai} />
 */

import React from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useNfcScan } from '../../hooks/useNfcScan';
import { getBufaloPorMicrochip } from '../../services/bufaloService';
import { colors } from '../../styles/colors';
import Scanner from '../../../assets/images/qr-scan.svg'

interface NfcBrincoButtonProps {
  mode: 'microchip' | 'brinco';
  onResult: (value: string) => void;
  /** Necessário apenas para mode='brinco' com filtro de sexo */
  propriedadeId?: string;
  /** 'M' ou 'F' — valida o sexo do animal encontrado */
  sexo?: 'M' | 'F';
}

export function NfcBrincoButton({
  mode,
  onResult,
  sexo,
}: NfcBrincoButtonProps) {
  const { scan, scanning } = useNfcScan();

  const handlePress = async () => {
    const microchip = await scan();

    if (!microchip) {
      // scan retornou null: NFC indisponível ou cancelado — sem alert (usuário sabe)
      return;
    }

    if (mode === 'microchip') {
      onResult(microchip);
      return;
    }

    // mode === 'brinco': busca animal pelo microchip no SQLite local
    try {
      const animal = await getBufaloPorMicrochip(microchip);

      if (sexo && animal.sexo !== sexo) {
        const esperado = sexo === 'M' ? 'macho' : 'fêmea';
        const encontrado = animal.sexo === 'M' ? 'macho' : 'fêmea';
        Alert.alert(
          'Animal incorreto',
          `Brinco ${animal.brinco ?? microchip}: este animal é ${encontrado}, mas o campo espera ${esperado}.`,
        );
        return;
      }

      onResult(animal.brinco ?? animal.brinco_original ?? microchip);
    } catch {
      Alert.alert(
        'Não encontrado',
        `Nenhum animal com microchip ${microchip} encontrado. Sincronize os dados ou verifique o brinco.`,
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={handlePress}
      disabled={scanning}
      activeOpacity={0.7}
      accessibilityLabel={scanning ? 'Lendo tag RFID...' : 'Ler tag RFID'}
    >
      {scanning ? (
        <ActivityIndicator size="small" color={colors.brand.primary} />
      ) : (
        <Scanner width={24} height={24} fill="black" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.section,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
});
