import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";
import TextTitle from "../TextTitle";
import { usePropriedade } from "../../context/PropriedadeContext";
import SelectBottomSheet from "../SelectBottomSheet";
import { DownloadButton, SyncProgressBar } from "../DownloadButton";
import { useSyncStatus } from "../../context/SyncContext";

interface PropriedadesProps {
  prop?: any[];
}

export default function Propriedades({ prop }: PropriedadesProps) {
  const { propriedadeSelecionada, setPropriedadeSelecionada } = usePropriedade();
  const { triggerDownload } = useSyncStatus();
  const [items, setItems] = useState<{ label: string; value: string }[]>([]);
  const [propNome, setPropNome] = useState('');

  useEffect(() => {
    if (prop && prop.length > 0) {
      const mapped = prop.map((p: any) => ({
        label: p.nome,
        value: p.id,
      }));

      setItems(mapped);

      if (!propriedadeSelecionada) {
        setPropriedadeSelecionada(mapped[0].value);
      }
    }
  }, [prop]);

  // Mantém o nome da propriedade selecionada para notificação Android
  useEffect(() => {
    if (!prop) return;
    const found = prop.find((p: any) => p.id === propriedadeSelecionada);
    if (found) setPropNome(found.nome ?? '');
  }, [prop, propriedadeSelecionada]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextTitle>Propriedades</TextTitle>
      </View>

      <View style={styles.selectorRow}>
        <View style={{ flex: 1 }}>
          <SelectBottomSheet
            items={items}
            value={propriedadeSelecionada}
            onChange={(value) => setPropriedadeSelecionada(value)}
            title="Selecionar propriedade"
            placeholder="Selecione uma propriedade"
          />
        </View>
        <DownloadButton propertyName={propNome} />
      </View>

      <SyncProgressBar onRetry={() => triggerDownload(propNome)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
