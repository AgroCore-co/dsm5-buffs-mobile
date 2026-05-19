import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";
import TextTitle from "../TextTitle";


interface DashPropriedadeProps {
  total: number;
  machos: number;
  femeas: number;
  bezerros: number;
  novilhas: number;
  vacas: number;
  touros: number;
}

export default function DashPropriedade({
  total,
  machos,
  femeas,
  bezerros,
  novilhas,
  vacas,
  touros,
}: DashPropriedadeProps) {
  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TextTitle>Resumo do Rebanho</TextTitle>
        <Text style={styles.subtitle}>{total} búfalos no total</Text>
      </View>

      {/* Primeira linha */}
      <View style={styles.row}>
        <View style={[styles.item, {borderBottomWidth: 0.2}]}>
          <Text style={styles.value}>{machos}</Text>
          <Text style={styles.label}>Machos</Text>
        </View>
        <View style={[styles.item, {borderBottomWidth: 0.2}]}>
          <Text style={styles.value}>{femeas}</Text>
          <Text style={styles.label}>Fêmeas</Text>
        </View>
      </View>

      {/* Segunda linha */}
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.value}>{bezerros}</Text>
          <Text style={styles.label}>Bezerros</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.value}>{novilhas}</Text>
          <Text style={styles.label}>Novilhas</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.value}>{vacas}</Text>
          <Text style={styles.label}>Vacas</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.value}>{touros}</Text>
          <Text style={styles.label}>Touros</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1, // deixa abaixo do dropdown
    zIndex: 1,    // iOS
  },
  header: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted
  },
  row: { 
    flexDirection: "row", 
    justifyContent: "space-around", 
    marginBottom: 16,
  },
  item: {
    alignItems: "center",
    flex: 1,
    borderRightWidth: 0.2,
    borderLeftWidth: 0.2,
    borderColor: colors.border.default,
  },
  value: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4
  },
  label: {
    fontSize: 12,
    color: colors.text.muted
  },
});
