import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { colors } from "../../styles/colors";
import Sanit from "../../../assets/images/termometro.svg";
import { formatarDataBR } from "../../utils/date";


export const SanitarioCard = ({ item, onDelete, onPress }: any) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.iconContainer}>
    </View>

    {/* Bloco de Texto Principal */}
    <View style={styles.textContainer}>
      <Text style={styles.textData}>Registrado em: {formatarDataBR(item?.dtAplicacao)}</Text>

      <Text style={styles.textInfoPrincipal} numberOfLines={1}>
        Ocorrência: {item.doenca ?? "Sem diagnóstico"}
      </Text>

      <Text style={styles.textInfoSecundaria} numberOfLines={1}>
        Medicação: {item.nome_medicamento ?? "-"} | Dosagem:{" "}
        {item.dosagem ? `${item.dosagem} ${item.unidadeMedida}` : "-"}
      </Text>

      <Text style={styles.textInfoSecundaria} numberOfLines={1}>
        Retorno: {item.necessitaRetorno ? "Sim" : "Não"}
      </Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white.base,
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconContainer: {
    width: 10, 
    height: 10,
    borderRadius: 24,
    backgroundColor: colors.yellow.base,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
  },
  textData: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black.base,
  },
  textInfoPrincipal: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.black.base,
  },
  textInfoSecundaria: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.gray.text,
  },
  deleteButton: {
    flexShrink: 0,
    padding: 8,
    marginLeft: 8,
  },
  deleteText: {
    color: "#E53E3E",
    fontSize: 18,
    fontWeight: "bold",
  },
});
