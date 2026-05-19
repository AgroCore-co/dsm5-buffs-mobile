import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";
import { Grupo } from "../../services/grupoService";
import { StatusGrupo } from "../../services/movLoteService";

type CardGrupoProps = {
  grupo: Grupo;
  statusAtual?: StatusGrupo | null;
  loteNome?: string;
  onMover?: () => void;
  onPress?: () => void;
};

export const CardGrupo: React.FC<CardGrupoProps> = ({
  grupo,
  statusAtual,
  loteNome,
  onMover,
  onPress,
}) => {
  const localAtual = statusAtual?.localizacao_atual;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.colorDot, { backgroundColor: grupo.color || colors.border.muted }]} />

      <View style={styles.content}>
        <Text style={styles.nome}>{grupo.nome}</Text>

        {localAtual ? (
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              {loteNome || "Lote desconhecido"} • {localAtual.dias_no_local} {localAtual.dias_no_local === 1 ? "dia" : "dias"}
            </Text>
          </View>
        ) : (
          <Text style={styles.noLocation}>Sem localização registrada</Text>
        )}
      </View>

      {onMover && (
        <TouchableOpacity style={styles.moverBtn} onPress={onMover} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.moverBtnText}>Mover</Text>
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
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  nome: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.title,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationIcon: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  noLocation: {
    fontSize: 13,
    color: colors.text.placeholder,
    fontStyle: "italic",
  },
  moverBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moverBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text.accent,
  },
});
