import React from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import { colors } from "../../styles/colors";

import TextTitle from "../TextTitle";

interface DashReproductionProps {
  emProcesso: number;
  confirmadas: number;
  concluidas: number;
  falhas: number;
  ultimaData: string;
}

export default function DashReproduction({
  emProcesso,
  confirmadas,
  concluidas,
  falhas,
  ultimaData,
}: DashReproductionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <TextTitle>
            Reprodução
          </TextTitle>

          <Text style={styles.subtitle}>
            Status reprodutivo atual
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>
              Em processo
            </Text>
            <Text style={styles.statValue}>
              {emProcesso}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>
              Confirmadas
            </Text>
            <Text style={styles.statValue}>
              {confirmadas}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>
              Concluídas
            </Text>
            <Text style={styles.statValue}>
              {concluidas}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>
              Falhas
            </Text>
            <Text style={styles.statValue}>
              {falhas}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Atualizado em {ultimaData}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.black,
    shadowOpacity: 0.03,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 3,
    elevation: 1,
  },

  header: {
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 1,
    lineHeight: 14,
  },

  statsGrid: {
    borderRadius: 20,
    backgroundColor: colors.bg.section,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },

  statCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 6,
  },

  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border.default,
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text.accent,
    lineHeight: 24,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.muted,
    marginTop: 1,
  },

  footer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },

  footerText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text.muted,
    textAlign: "center",
  },
});