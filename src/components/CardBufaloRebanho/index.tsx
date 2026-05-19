import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

export type CardBufaloProps = {
  nome: string;
  brinco: string;
  status: boolean;
  sexo: "F" | "M";
  maturidade: string;
  categoria?: string;
  onPress?: () => void;
};

export const CardBufalo: React.FC<CardBufaloProps> = ({
  nome,
  brinco,
  status,
  sexo,
  maturidade,
  categoria,
  onPress,
}) => {
  const isAtivo = status === true;

  const maturidadeMap: Record<string, string> = {
    B: "Bezerro",
    N: "Novilha",
    T: "Touro",
    V: "Vaca",
  };
  const maturidadeTexto = maturidadeMap[maturidade] || maturidade;

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
      {/* Indicador de status lateral */}
      <View
        style={[
          styles.statusBar,
          { backgroundColor: isAtivo ? colors.status.successActive : colors.status.errorFade },
        ]}
      />

      {/* Conteúdo principal */}
      <View style={styles.content}>
        {/* Nome e Brinco */}
        <View>
          <Text style={styles.name}>{nome}</Text>
          <Text style={styles.brinco}>Brinco: Nº {brinco}</Text>
        </View>

        {/* Chips */}
        <View style={styles.chipRow}>
          {/* Sexo */}
          <View style={styles.chip}>
            <Text style={styles.chipIcon}>{sexo === "F" ? "♀ Fêmea" : "♂ Macho"}</Text>
          </View>

          {/* Maturidade */}
          <View style={styles.chip}>
            <Text style={styles.chipIcon}>✔</Text>
            <Text style={styles.chipText}>{maturidadeTexto}</Text>
          </View>

          {/* Categoria */}
          {categoria && (
            <View style={[styles.chip, styles.categoryChip]}>
              <Text style={styles.categoryText}>{categoria}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    padding: 12,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
    marginBottom: 10
  },
  statusBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  content: {
    flex: 1,
    paddingLeft: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.title,
  },
  brinco: {
    fontSize: 13,
    color: colors.text.muted,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.section,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 13,
    color: colors.text.body,
    marginLeft: 4,
  },
  chipIcon: {
    fontSize: 14,
    color: colors.text.body,
  },
  categoryChip: {
    backgroundColor: colors.brand.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.accent,
  },
  moreButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  moreButtonText: {
    fontSize: 20,
    color: colors.text.muted,
  },
});
