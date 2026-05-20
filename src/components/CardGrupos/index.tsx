import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import { colors } from "../../styles/colors";

interface CardGrupoProps {
  nome: string;
  piquete?: string;
  status?: string;
  quantidade?: number;
  ocupacao?: number;
  color?: string;
  onPress?: () => void;
}

export const CardGrupo = ({
  nome,
  piquete,
  status = "Ativo",
  quantidade = 0,
  ocupacao = 0,
  color = colors.brand.primary,
  onPress,
}: CardGrupoProps) => {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.92}
      onPress={onPress}
    >
      {/* Barra lateral */}
      <View
        style={[
          styles.colorBar,
          { backgroundColor: color },
        ]}
      />

      {/* Conteúdo */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {nome}
            </Text>

            <Text style={styles.location}>
              📍 {piquete || "Sem piquete"}
            </Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {status}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Quantidade */}
          <View>
            <Text style={styles.label}>
              Efetivo
            </Text>

            <View style={styles.quantityRow}>
              <Text style={styles.quantity}>
                {quantidade}
              </Text>

              <Text style={styles.quantityLabel}>
                cabeças
              </Text>
            </View>
          </View>

          {/* Ocupação */}
          <View style={styles.occupationContainer}>
            <Text style={styles.label}>
              Ocupação
            </Text>

            <View style={styles.progressRow}>
              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${ocupacao}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>

              <Text style={styles.percent}>
                {ocupacao}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.bg.card,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,

    borderWidth: 1,
    borderColor: colors.border.default,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  colorBar: {
    width: 8,
  },

  content: {
    flex: 1,
    padding: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.accent,
  },

  location: {
    marginTop: 4,
    fontSize: 13,
    color: colors.text.secondary,
  },

  badge: {
    backgroundColor: colors.brand.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brand.primary,
  },

  footer: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  label: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },

  quantityRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },

  quantity: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text.accent,
  },

  quantityLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  occupationContainer: {
    alignItems: "flex-end",
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  progressBackground: {
    width: 80,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.status.pendingBg,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  percent: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text.accent,
  },
});