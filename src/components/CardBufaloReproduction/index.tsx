import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

export type CardReproducaoProps = {
  reproducao: any;
  onPress?: () => void;
};

// ✅ Status reais do domínio
type StatusType =
  | "Em andamento"
  | "Confirmada"
  | "Concluída"
  | "Falhou";

// 🔁 Normaliza qualquer valor inesperado
const normalizeStatus = (status: string): StatusType => {
  if (status === "Em andamento") return "Em andamento";
  if (status === "Confirmada") return "Confirmada";
  if (status === "Concluída") return "Concluída";
  if (status === "Falhou" || status === "Falha") return "Falhou";
  return "Em andamento";
};

export const CardReproducao: React.FC<CardReproducaoProps> = ({
  reproducao,
  onPress,
}) => {
  const status: StatusType = normalizeStatus(reproducao.status);

  // 🎨 Cores por status (regra FINAL)
  const statusColors: Record<
    StatusType,
    { bg: string; text: string }
  > = {
    "Em andamento": {
      bg: colors.status.warningBg,
      text: colors.status.pendingBg,
    },
    "Confirmada": {
      bg: colors.status.warningBg,
      text: colors.status.pendingBg,
    },
    "Concluída": {
      bg: colors.status.successBg,
      text: colors.status.successActive,
    },
    "Falhou": {
      bg: colors.status.errorBg,
      text: colors.status.errorFade,
    },
  };

  const barColors: Record<StatusType, string> = {
    "Em andamento": colors.status.pendingBg,
    "Confirmada": colors.status.pendingBg,
    "Concluída": colors.status.successActive,
    "Falhou": colors.status.errorFade,
  };

  const color = statusColors[status];

  // 🧬 Material genético
  const materialGenetico = !reproducao.brincoTouro
    ? reproducao.id_semen || reproducao.id_ovulo
      ? `${(reproducao.id_semen || reproducao.id_ovulo).slice(0, 5)}`
      : "—"
    : null;

  // ✅ Texto de sucesso (agora coerente)
  const concluidaValue =
    status === "Falhou"
      ? "Não, falhou"
      : status === "Concluída"
      ? reproducao.tipo_parto
        ? `Sim, parto: ${reproducao.tipo_parto.toLowerCase()}`
        : "Sim"
      : status === "Confirmada"
      ? "Sim, prenha"
      : "Em acompanhamento";

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
      <View
        style={[
          styles.statusBar,
          { backgroundColor: barColors[status] },
        ]}
      />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.nome}>
            Búfala: {reproducao.brincoBufala || "Sem nome"}
          </Text>
          {reproducao.brincoTouro && (
            <Text style={styles.brinco}>
              Reprodutor: {reproducao.brincoTouro}
            </Text>
          )}
        </View>

        {/* Chips */}
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Inseminação</Text>
            <Text style={styles.chipValue}>
              {reproducao.tipo_inseminacao || "—"}
            </Text>
          </View>

          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Data Cruzamento</Text>
            <Text style={styles.chipValue}>
              {reproducao.dataCruzamento || "—"}
            </Text>
          </View>

          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Sucesso?</Text>
            <Text style={styles.chipValue}>{concluidaValue}</Text>
          </View>

          {materialGenetico && (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Material</Text>
              <Text style={styles.chipValue}>{materialGenetico}</Text>
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
    alignItems: "flex-start",
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    padding: 12,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
    marginBottom: 10,
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
  header: {
    marginBottom: 8,
  },
  nome: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.title,
  },
  brinco: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.section,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.body,
    marginRight: 4,
  },
  chipValue: {
    fontSize: 12,
    color: colors.text.body,
  },
});
