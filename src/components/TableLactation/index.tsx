import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image} from "react-native";
import { colors } from "../../styles/colors"; // ajuste para seu projeto
import BuffsLogo from '../../../assets/images/buffs.svg'; 
import Prontuario from '../../../assets/images/prontuario.svg'; 
import Button from "../Button";

export type AnimalLac = {
  id: string | number;
  idBufala: number;
  status: boolean;   // true = verde, false = vermelho
  brinco: string;
  raca: string;
  nome: string;
};

type Props = {
  data: AnimalLac[];
  onVerMais: (animal: AnimalLac) => void; // callback para abrir outra tela/tabela
};

export default function TableLactation({ data, onVerMais }: Props) {
  const itensPorPagina = 15;
  const [paginaAtual, setPaginaAtual] = useState(0);

  // range da página atual
  const startIndex = paginaAtual * itensPorPagina;
  const endIndex = startIndex + itensPorPagina;
  const dadosPagina = data.slice(startIndex, endIndex);

  const totalPaginas = Math.ceil(data.length / itensPorPagina);

  return (
    <View>
      {/* Cabeçalho */}
      <View style={styles.listHeader}>
        <View style={{ flex: 0.3, alignItems: 'center', justifyContent: 'center' }}>
          <BuffsLogo width={18} height={18} />
        </View>
        <Text style={[styles.listHeaderText, { flex: 1 }]}>Brinco</Text>
        <Text style={[styles.listHeaderText, { flex: 1 }]}>Nome</Text>
        <Text style={[styles.listHeaderText, { flex: 1 }]}>Raça</Text>
        <Text style={[styles.listHeaderText, { flex: 1 }]}>Ver Mais</Text>
      </View>

      {/* Lista */}
      <FlatList
        data={dadosPagina}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            {/* Status */}
            <View
              style={[
                styles.statusCircle,
                { backgroundColor: item.status ? colors.status.successActive : colors.status.errorFade },
              ]}
            />

            {/* Colunas */}
            <Text style={[styles.itemText, { flex: 1 }]} numberOfLines={1}>
              {item.brinco}
            </Text>
            <Text style={[styles.itemText, { flex: 1}]} numberOfLines={1}>
              {item.nome}
            </Text>
            <Text style={[styles.itemText, { flex: 1 }]} numberOfLines={1}>
              {item.raca}
            </Text>

            {/* Botão Ver Mais */}
            <TouchableOpacity
              onPress={() => onVerMais(item)}
              style={styles.linkButton}
            >
            <View style={{ flex: 0.1, alignItems: 'center', justifyContent: 'center' }}>
              <Prontuario width={18} height={18} />
            </View>
            </TouchableOpacity>
          </View>
        )}
      />
            {/* Paginação */}
            <View style={styles.pagination}>
              <Button
                title="Anterior"
                onPress={() => setPaginaAtual(paginaAtual - 1)}
                disabled={paginaAtual === 0}
              />
      
              <Text style={styles.pageInfo}>
                Página {paginaAtual + 1} de {totalPaginas}
              </Text>
      
              <Button
                title="Próxima"
                onPress={() => setPaginaAtual(paginaAtual + 1)}
                disabled={paginaAtual + 1 >= totalPaginas}
              />
            </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  listHeader: {
    flexDirection: "row",
    backgroundColor: colors.bg.input,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  listHeaderText: {
    fontWeight: "600",
    color: colors.text.body,
    textAlign: "center",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.border.default,
  },
  itemText: {
    textAlign: "center",
    color: colors.text.heading,
  },
  statusCircle: {
    width: 12,
    height: 12,
    borderRadius: 7,
    marginHorizontal: 6,
  },
  linkButton: {
    flex: 1,
    alignItems: "center",
  },
  linkText: {
    color: colors.text.link,
    fontWeight: "600",
  },
  pageInfo: {
    marginHorizontal: 12,
    fontWeight: "600",
    color: colors.text.body,
    textAlign: "center",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 8,
  },
});
