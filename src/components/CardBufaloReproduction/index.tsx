import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

export type CardReproducaoProps = {
  reproducao: any;
  onPress?: () => void;
};

type StatusType = "Em Andamento/Confirmada" | "Concluída" | "Falha";

export const CardReproducao: React.FC<CardReproducaoProps> = ({ reproducao, onPress }) => {
const status: StatusType =
    reproducao.status === "Falha"
      ? "Falha"
      : reproducao.status === "Concluída" // Novo status de sucesso
      ? "Concluída"
      : "Em Andamento/Confirmada"; // Agrupa "Em andamento" e "Confirmada"

const statusColors: Record<StatusType, { bg: string; text: string }> = {
    // Laranja/Amarelo para "Em andamento" E "Confirmada"
    "Em Andamento/Confirmada": { bg: "#FEF3C7", text: colors.yellow.static }, 
    // Verde para "Concluída"
    "Concluída": { bg: "#D1FAE5", text: colors.green.active }, 
    // Vermelho para "Falha"
    Falha: { bg: "#FEE2E2", text: colors.red.inactive },
  };

const barColors: Record<StatusType, string> = {
    "Em Andamento/Confirmada": colors.yellow.static,
    "Concluída": colors.green.active,
    Falha: colors.red.inactive,
  };

  const color = statusColors[status];

  // Determina o material genético exibido
  const materialGenetico = !reproducao.brincoTouro
    ? reproducao.id_semen || reproducao.id_ovulo
      ? `${(reproducao.id_semen || reproducao.id_ovulo).slice(0, 5)}`
      : "—"
    : null;

  // Determina o valor do chip "Concluída"
  const concluidaValue =
    status === "Falha"
      ? "Não, Falha"
      : reproducao.concluida
      ? reproducao.tipo_parto
        ? `Sim, parto: ${reproducao.tipo_parto.toLowerCase()}`
        : "Sim"
      : "Não";

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
      <View style={[styles.statusBar, { backgroundColor: barColors[status] }]} />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.nome}>Búfala: {reproducao.brincoBufala || "Sem nome"}</Text>
          {reproducao.brincoTouro && (
            <Text style={styles.brinco}>Reprodutor: {reproducao.brincoTouro}</Text>
          )}
        </View>

        {/* Chips */}
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Inseminação</Text>
            <Text style={styles.chipValue}>{reproducao.tipo_inseminacao || "—"}</Text>
          </View>

          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Data Cruzamento</Text>
            <Text style={styles.chipValue}>{reproducao.dataCruzamento || "—"}</Text>
          </View>

          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Sucesso ? </Text>
            <Text style={styles.chipValue}>{concluidaValue}</Text>
          </View>

          {/* Mostra material genético se não houver brincoTouro */}
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
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
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
    color: "#1A1A1A",
  },
  brinco: {
    fontSize: 13,
    color: "#6B7280",
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
    backgroundColor: "#F7F8FA",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginRight: 4,
  },
  chipValue: {
    fontSize: 12,
    color: "#374151",
  },
});
