import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { colors } from "../../styles/colors";
import Sanit from "../../../assets/images/termometro.svg";
import { formatarDataBR } from "../../utils/date";
import Calendar from '../../../assets/images/calendar-clock.svg';


export const SanitarioCard = ({ item, onDelete, onPress }: any) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.iconContainer}>
    </View>

    {/* Bloco de Texto Principal */}
    <View style={styles.textContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6}}>
        <Text style={styles.textData}>
          {item.doenca ?? "Sem diagnóstico"} |
        </Text>

        <Calendar width={12} height={12} fill={colors.brown.base} />

        <Text style={styles.textData}>
          {formatarDataBR(item?.dtAplicacao)}
        </Text>
      </View>
      <Text style={styles.textInfoPrincipal} numberOfLines={1}>
        MEDICAÇÃO: {item.nome_medicamento ?? "-"}
      </Text>

      <Text style={styles.textInfoSecundaria} numberOfLines={1}>
        DOSAGEM:{" "}
        {item.dosagem ? `${item.dosagem} ${item.unidadeMedida}` : "-"}
      </Text>

      <Text style={styles.textInfoSecundaria} numberOfLines={1}>
        RETORNO? - {item.necessitaRetorno ? "Sim" : "Não"}
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
    width: 20, 
    height: 5,
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
    fontSize: 14, 
    fontWeight: '700', 
    color: colors.brown.base,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  textInfoPrincipal: {
    fontSize: 13, 
    fontWeight: '500', 
    color: colors.brown.base
  },
  textInfoSecundaria: {
    fontSize: 12, 
    fontWeight: '400', 
    color: colors.gray.text,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  deleteButton: {
    flexShrink: 0,
    padding: 8,
    marginLeft: 8,
  },
  deleteText: {
    color: colors.red.base,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
