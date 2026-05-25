/**
 * NfcTextInput
 *
 * TextInput com botão de leitura RFID embutido na borda direita.
 * Drop-in replacement para os pares TextInput + NfcBrincoButton.
 *
 * Modos:
 *   'microchip' → preenche com o ID bruto da tag NFC (hex uppercase)
 *   'brinco'    → lê a tag, busca o animal no SQLite pelo microchip,
 *                 preenche com o brinco do animal
 *
 * Exemplo:
 *   <NfcTextInput
 *     mode="brinco"
 *     sexo="F"
 *     propriedadeId={propId}
 *     value={tagBufala}
 *     onChangeText={setTagBufala}
 *     onResult={setTagBufala}
 *     placeholder="Digite ou leia via RFID"
 *   />
 */

import React from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useNfcScan } from '../../hooks/useNfcScan';
import { getBufaloPorMicrochip } from '../../services/bufaloService';
import { colors } from '../../styles/colors';
import Scanner from '../../../assets/images/qr-scan.svg'

interface NfcTextInputProps extends Omit<TextInputProps, 'style'> {
  /** Comportamento do scanner: lê microchip bruto ou resolve para brinco via SQLite */
  mode: 'microchip' | 'brinco';
  /** Callback com o valor resolvido (microchip ou brinco) */
  onResult: (value: string) => void;
  /** Necessário apenas para mode='brinco' */
  propriedadeId?: string | number;
  /** Valida o sexo do animal encontrado ('M' ou 'F') */
  sexo?: 'M' | 'F';
  /** Override de estilo no container externo (border box) */
  containerStyle?: ViewStyle;
}

export function NfcTextInput({
  mode,
  onResult,
  sexo,
  propriedadeId: _propriedadeId,
  containerStyle,
  ...inputProps
}: NfcTextInputProps) {
  const { scan, scanning } = useNfcScan();

  const handleScan = async () => {
    const microchip = await scan();
    if (!microchip) return;

    if (mode === 'microchip') {
      onResult(microchip);
      return;
    }

    // mode === 'brinco': resolve microchip → brinco via SQLite local
    try {
      const animal = await getBufaloPorMicrochip(microchip);

      if (sexo && animal.sexo !== sexo) {
        const esperado  = sexo === 'M' ? 'macho' : 'fêmea';
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
    <View style={[styles.container, containerStyle]}>
      <TextInput
        placeholderTextColor={colors.text.muted}
        {...inputProps}
        style={styles.input}
      />
      <View style={styles.divider} />
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={handleScan}
        disabled={scanning}
        activeOpacity={0.6}
        accessibilityLabel={scanning ? 'Lendo tag RFID…' : 'Ler tag RFID'}
      >
        {scanning
          ? <ActivityIndicator size="small" color={colors.brand.primary} />
          : <Scanner width={24} height={24} fill={colors.brown.base} />
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    backgroundColor: colors.bg.card,
    overflow: 'hidden',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text.heading,
    height: '100%',
    // Remove a borda própria do TextInput — o container já faz o papel
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border.default,
  },
  iconBtn: {
    width: 46,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.status.warningBg
  },
});
