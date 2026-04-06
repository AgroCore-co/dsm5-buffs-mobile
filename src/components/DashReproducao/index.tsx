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
      </View>

      {/* Primeira linha */}
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.value}>{emProcesso}</Text>
          <Text style={styles.label}>EM PROCESSO</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.value}>{confirmadas}</Text>
          <Text style={styles.label}>SUCESSO</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.value}>{falhas}</Text>
          <Text style={styles.label}>FALHAS</Text>
        </View>
      </View>
      
      <Text style={styles.footerText}>Última atualização: {formatarDataBR(ultimaData)}</Text>
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
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.gray.disabled,
  },
  value: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 4 
  },
  label: { 
    fontSize: 12, 
    color: colors.gray.base,
    marginBottom: 4,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 11,
    color: colors.gray.base,
    textAlign: "right",
  },
});
