import React from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import { colors } from "../../styles/colors";

import TextTitle from "../TextTitle";

interface DashLactationProps {
  totalArmazenado: number;
  vacasLactando: number;
  dataAtualizacao: string;
}

export default function DashLactation({
  totalArmazenado,
  vacasLactando,
  dataAtualizacao,
}: DashLactationProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <TextTitle>
            Produção de Leite
          </TextTitle>

          <Text style={styles.subtitle}>
            Resumo geral da lactação
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>
            Total produzido
          </Text>

          <Text style={styles.statValue}>
            {totalArmazenado}
            <Text style={styles.unit}>
              {" "}L
            </Text>
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>
            Vacas lactando
          </Text>

          <Text style={styles.statValue}>
            {vacasLactando}
          </Text>

          <Text style={styles.helperText}>
            em produção
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Atualizado em {dataAtualizacao}
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

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: colors.bg.section,
    paddingHorizontal: 6,
  },

  statCard: {
    flex: 1,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
    justifyContent: "center",
  },

  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.default,
  },

  subtitle: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 1,
    lineHeight: 14,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.muted,
    marginBottom: 1,
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text.accent,
    lineHeight: 24,
  },

  unit: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text.secondary,
  },

  helperText: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: -1,
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