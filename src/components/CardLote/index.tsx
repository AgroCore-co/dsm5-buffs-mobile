import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";
import { Piquete } from "../../services/piqueteService";

type CardLoteProps = {
  lote: Piquete;
  onPress?: () => void;
  onMoverGrupo?: () => void;
};

function getStatusLabel(lote: Piquete): { label: string; bg: string; text: string } {
  if (lote.status === "descanso") {
    return { label: "Descanso", bg: colors.status.warningBg, text: colors.status.warningText };
  }
  if (lote.idGrupo) {
    return { label: "Ocupado", bg: colors.status.successBg, text: colors.status.successText };
  }
  return { label: "Vazio", bg: colors.bg.section, text: colors.text.muted };
}

export const CardLote: React.FC<CardLoteProps> = ({ lote, onPress, onMoverGrupo }) => {
  const barColor = lote.idGrupo ? (lote.grupoCor || colors.brand.dark) : colors.border.muted;
  const statusStyle = getStatusLabel(lote);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statusBar, { backgroundColor: barColor }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.nome} numberOfLines={1}>{lote.nome}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        {lote.idGrupo ? (
          <Text style={styles.grupo}>Grupo: {lote.grupoNome}</Text>
        ) : (
          <Text style={[styles.grupo, { color: colors.text.placeholder }]}>Sem grupo alocado</Text>
        )}

        <View style={styles.chipRow}>
          {lote.tipoLote && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{lote.tipoLote}</Text>
            </View>
          )}
          {typeof lote.areaM2 === "number" && lote.areaM2 > 0 && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{(lote.areaM2 / 10000).toFixed(1)} ha</Text>
            </View>
          )}
        </View>
      </View>

      {onMoverGrupo && lote.idGrupo && (
        <TouchableOpacity style={styles.transferBtn} onPress={onMoverGrupo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.transferBtnText}>↔</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  statusBar: {
    width: 5,
    alignSelf: "stretch",
  },
  content: {
    flex: 1,
    padding: 12,
    paddingLeft: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nome: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.title,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  grupo: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    backgroundColor: colors.bg.section,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 12,
    color: colors.text.muted,
  },
  transferBtn: {
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  transferBtnText: {
    fontSize: 20,
    color: colors.brand.dark,
  },
});
