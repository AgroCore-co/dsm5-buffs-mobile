import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";
import TextTitle from "../TextTitle";
import { formatarDataBR } from "../../utils/date";

interface DashReproductionProps {
  emProcesso: number;       // total de reproduções em andamento
  confirmadas: number;      // total de reproduções confirmadas
  falhas: number;           // total de reproduções com falha
  ultimaData: string;  // data do último registro
}

export default function DashReproduction({
  emProcesso,
  confirmadas,
  falhas,
  ultimaData,
}: DashReproductionProps) {
  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TextTitle>Resumo das Reprodução</TextTitle>
        <Text style={styles.subtitle}>Última atualização: {formatarDataBR(ultimaData)}</Text>
      </View>

      {/* Primeira linha */}
      <View style={styles.row}>
        <View style={[styles.item, { borderBottomWidth: 0.2 }]}>
          <Text style={styles.value}>{emProcesso}</Text>
          <Text style={styles.label}>Em Processo</Text>
        </View>
        <View style={[styles.item, { borderBottomWidth: 0.2 }]}>
          <Text style={styles.value}>{confirmadas}</Text>
          <Text style={styles.label}>Sucesso</Text>
        </View>
        <View style={[styles.item, { borderBottomWidth: 0.2 }]}>
          <Text style={styles.value}>{falhas}</Text>
          <Text style={styles.label}>Falhas</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray.disabled,
    shadowColor: colors.black.base,
    shadowOpacity: 0.05,
    shadowOffset: { 
      width: 0, 
      height: 2 
    },
    shadowRadius: 4,
    elevation: 2, 
    zIndex: 1000
  },
  header: {
    marginBottom: 16,
  },
  subtitle: { 
    fontSize: 14, 
    color: colors.gray.base 
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
    borderColor: colors.gray.disabled,
  },
  value: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 4 
  },
  label: { 
    fontSize: 12, 
    color: colors.gray.base 
  },
});
