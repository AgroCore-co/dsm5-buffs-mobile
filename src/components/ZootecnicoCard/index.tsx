import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform // Importamos o Platform para o 'shadow'
} from "react-native";
import { colors } from "../../styles/colors"; 
import Zootec from "../../../assets/images/statistics.svg"
import { formatarDataBR } from "../../utils/date";

  // Função auxiliar para formatar
  function formatarDataSimples(dataISO: string) {
    if (!dataISO) {
      return '-';
    }
    const soData = dataISO.split('T')[0];
    const partes = soData.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

export const ZootecnicoCard = ({ item, onDelete, onPress }: any) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.iconContainer}>
      <Zootec width={20} height={20} />
    </View>

    {/* Bloco de Texto Principal */}
    <View style={styles.textContainer}>
      <Text style={styles.textData}>{formatarDataBR(item?.dtRegistro)}</Text>
      <Text style={styles.textInfoPrincipal} numberOfLines={1}>{item.peso} kg | CC: {item.condicaoCorporal}</Text>
      
      <Text style={styles.textInfoSecundaria} numberOfLines={1}>
        Pelagem: {item.corPelagem} | Porte: {item.porteCorporal} | Tipo: {item.tipoPesagem}
      </Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white.base,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
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
    width: 48, 
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.yellow.base,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: {
    fontSize: 24, 
    color: colors.yellow.base
  },
  textContainer: {
    flex: 1, 
    flexDirection: "column",
    gap: 4, 
  },
  textData: {
    fontSize: 16, 
    fontWeight: "bold", 
    color: colors.black.base
  },
  textInfoPrincipal: {
    fontSize: 14, 
    fontWeight: "500", 
    color: colors.black.base
  },
  textInfoSecundaria: {
    fontSize: 12, 
    fontWeight: "400", 
    color: colors.gray.text
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