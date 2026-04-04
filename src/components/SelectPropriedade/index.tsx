import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";
import TextTitle from "../TextTitle";
import { usePropriedade } from "../../context/PropriedadeContext";
import SelectBottomSheet from "../SelectBottomSheet";

interface PropriedadesProps {
  prop?: any[];
}

export default function Propriedades({ prop }: PropriedadesProps) {
  const { propriedadeSelecionada, setPropriedadeSelecionada } = usePropriedade();
  const [items, setItems] = useState<{ label: string; value: string }[]>([]);

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextTitle>Propriedades</TextTitle>
      </View>

      <SelectBottomSheet
        items={items}
        value={propriedadeSelecionada}
        onChange={(value) => setPropriedadeSelecionada(value)}
        title="Selecionar propriedade"
        placeholder="Selecione uma propriedade"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray.disabled,
    shadowColor: colors.black.base,
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
});