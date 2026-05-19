import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";
import TextTitle from "../TextTitle";

interface DashLactationProps {
  totalArmazenado: number; // quantidade de leite total produzido
  vacasLactando: number;   // número de vacas em lactação
  dataAtualizacao: string; // data da última atualização
}

export default function DashLactation({
  totalArmazenado,
  vacasLactando,
  dataAtualizacao,
}: DashLactationProps) {
  return (
    <View style={styles.card}>
      {/* Título */}
      <View style={styles.header}>
        <TextTitle>Resumo da Produção de Leite</TextTitle>
      </View>

      {/* Linha principal */}
      <View style={styles.row}>
        {/* Total Produzido */}
        <View style={styles.infoBox}>
          <Text style={styles.label}>TOTAL PRODUZIDO</Text>
          <Text style={styles.value}>{totalArmazenado} LITROS</Text>
        </View>

        {/* Vacas em Lactação */}
        <View style={[styles.infoBox, styles.borderbox]}>
          <Text style={styles.label}>VACAS EM LACTAÇÃO</Text>
          <Text style={styles.value}>{vacasLactando} VACAS</Text>
        </View>
      </View>

      {/* Rodapé */}
      <Text style={styles.footerText}>Última Atualização: {dataAtualizacao}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 10,
  },
  card: {
    flex: 1,
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
      height: 2
    },
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1000
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.accent,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  infoBox: {
    flex: 1,
  },
  borderbox: {
    borderLeftWidth: 2,
    borderColor: colors.border.default,
    paddingLeft: 20,
  },
  label: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 4,
    fontWeight: '600',
  },
  value: {
    fontSize: 20,
    fontWeight: "500",
    color: colors.text.accent,
  },
  footerText: {
    fontSize: 11,
    color: colors.text.muted,
    textAlign: "right",
  },
});
