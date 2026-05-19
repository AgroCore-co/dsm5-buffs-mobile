import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import Button from "../Button";
import { colors } from "../../styles/colors";

export default function Movimentacoes() {
  const movimentacoes = [
    {
      id: 1,
      grupo: "Lote A",
      hora: "08:30",
      saida: "Piquete 1",
      chegada: "Piquete 3",
      qtd: 12,
      motivo: "Rotação de pastagem",
    },
    {
      id: 2,
      grupo: "Bezerras",
      hora: "14:15",
      saida: "Curral",
      chegada: "Piquete 2",
      qtd: 8,
    },
    {
      id: 3,
      grupo: "Lote B",
      hora: "09:10",
      saida: "Piquete 4",
      chegada: "Piquete 6",
      qtd: 10,
    },
    {
      id: 4,
      grupo: "Lote C",
      hora: "11:45",
      saida: "Piquete 2",
      chegada: "Curral",
      qtd: 5,
    },
    {
      id: 5,
      grupo: "Bezerras",
      hora: "16:20",
      saida: "Piquete 3",
      chegada: "Piquete 1",
      qtd: 9,
    },
  ];

  const itensPorPagina = 3;
  const [paginaAtual, setPaginaAtual] = useState(0);

  // range da página atual
  const startIndex = paginaAtual * itensPorPagina;
  const endIndex = startIndex + itensPorPagina;
  const dadosPagina = movimentacoes.slice(startIndex, endIndex);

  const totalPaginas = Math.ceil(movimentacoes.length / itensPorPagina);

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.title}>Movimentações Diárias</Text>
        <Button title="Ver Mais" onPress={() => console.log("Ver mais")} />
      </View>

      {/* Header da lista */}
      <View style={styles.listHeader}>
        <Text style={[styles.listHeaderText, { flex: 1 }]}>Grupo</Text>
        <Text style={[styles.listHeaderText, { flex: 1, textAlign: "center" }]}>
          Lote Saída
        </Text>
        <Text style={[styles.listHeaderText, { flex: 1, textAlign: "center" }]}>
          Lote Chegada
        </Text>
        <Text style={[styles.listHeaderText, { width: 40, textAlign: "center" }]}>
          Qtd
        </Text>
      </View>

      {/* Lista */}
      <FlatList
        data={dadosPagina}
        scrollEnabled={false} 
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.grupo}</Text>
              </View>
              <Text style={{ flex: 1, textAlign: "center" }}>{item.saida}</Text>
              <Text style={{ flex: 1, textAlign: "center" }}>{item.chegada}</Text>
              <View style={styles.qtdBox}>
                <Text style={styles.qtdText}>{item.qtd}</Text>
              </View>
            </View>
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
    flex: 1,
    backgroundColor: colors.bg.card,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { 
    fontSize: 18, 
    fontWeight: "bold"
  },
  listHeader: {
    flexDirection: "row",
    backgroundColor: colors.bg.input,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  listHeaderText: {
    fontWeight: "600",
    color: colors.text.secondary
  },
  itemContainer: {
    backgroundColor: colors.bg.card,
    padding: 12,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
    elevation: 1,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: { 
    fontWeight: "bold" 
  },
  qtdBox: {
    width: 40,
    height: 28,
    backgroundColor: colors.status.warningBg,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  qtdText: {
    fontWeight: "bold",
    color: colors.status.warningText
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  pageInfo: { fontWeight: "600" },
});
