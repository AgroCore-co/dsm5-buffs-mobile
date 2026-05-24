import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";

import { MainLayout } from "../layouts/MainLayout";
import { colors } from "../styles/colors";
import BuffaloLoader from "../components/BufaloLoader";

import { grupoService, GrupoEnriquecido } from "../services/grupoService";
import { usePropriedade } from "../context/PropriedadeContext";
import { CardGrupo } from "../components/CardGrupos";

export const PiquetesScreen = () => {
  const [grupos, setGrupos] = useState<GrupoEnriquecido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { propriedadeSelecionada } = usePropriedade();

  const fetchGrupos = async () => {
    try {
      if (!propriedadeSelecionada) return;

      const data = await grupoService.getAllByPropriedade(
        propriedadeSelecionada.toString()
      );

      setGrupos(data);
    } catch (error) {
      console.error("Erro ao buscar grupos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGrupos();
  }, [propriedadeSelecionada]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGrupos();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BuffaloLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.header1Text}>GRUPOS | PIQUETES</Text>
      </View>

      <MainLayout>
        <FlatList
          data={grupos}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.brand.primary]}
              tintColor={colors.brand.primary}
            />
          }
          renderItem={({ item }) => (
            <CardGrupo
              nome={item.nome}
              color={item.color}
              quantidade={item.quantidade}
              ocupacao={item.ocupacao}
              piquete={item.piquete}
              onPress={() => {
                console.log(item.id);
              }}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nenhum grupo encontrado
            </Text>
          }
        />
      </MainLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    height: 60,
    backgroundColor: colors.brand.primary,
    justifyContent: "center",
    alignItems: "center",
    borderBottomColor: colors.brand.dark,
    borderBottomWidth: 2.5,
  },

  header1Text: {
    marginTop: 10,
    fontSize: 25,
    fontWeight: "900",
    color: colors.text.accent,
  },

  card: {
    backgroundColor: colors.bg.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },

  groupTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.accent,
  },

  groupDescription: {
    marginTop: 8,
    color: colors.text.secondary,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: colors.text.secondary,
  },
});