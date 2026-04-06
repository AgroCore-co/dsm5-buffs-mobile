import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform // Importamos o Platform para o 'shadow'
} from "react-native";
import { colors } from "../../styles/colors"; 
import { formatarDataBR } from "../../utils/date";
import Calendar from '../../../assets/images/calendar-clock.svg';


export const ZootecnicoCard = ({ item, onDelete, onPress }: any) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.iconContainer}/>

    {/* Bloco de Texto Principal */}
    <View style={styles.textContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5}}>
        <Calendar width={12} height={12} fill={colors.brown.base} style={{marginTop: 2}}/>
        <Text style={styles.textData}>
          DATA REGISTRO: {formatarDataBR(item?.dtRegistro)}
        </Text>
      </View>
      <Text style={styles.textInfoPrincipal} numberOfLines={1}>PESO: {item.peso} kg | PORTE: {item.porteCorporal} </Text>
      
      <Text style={styles.textInfoSecundaria} numberOfLines={1}>
        PELAGEM: {item.corPelagem} | CC: {item.condicaoCorporal} | TIPO: {item.tipoPesagem}
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
    color: colors.brown.base
  },
  textInfoPrincipal: {
    fontSize: 13, 
    fontWeight: '500', 
    color: colors.brown.base,
    textTransform: 'uppercase',
    includeFontPadding: false,
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