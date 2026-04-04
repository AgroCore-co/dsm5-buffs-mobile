import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";

import AlertasPendentes from "../components/Lembretes";
import { colors } from "../styles/colors";
import { MainLayout } from "../layouts/MainLayout";
import BuffaloLoader from "../components/BufaloLoader";
import RotateLeftIcon from "../icons/arrow";

import { usePropriedade } from "../context/PropriedadeContext";
import { useNavigation } from "@react-navigation/native";

export const NotificacoesScreen = () => {
  const navigation = useNavigation<{ goBack: () => void }>();
  const { propriedadeSelecionada } = usePropriedade();

  const [loadingInicial, setLoadingInicial] = useState(true);

  useEffect(() => {
    if (propriedadeSelecionada) {
      setLoadingInicial(false);
    }
  }, [propriedadeSelecionada]);

  if (loadingInicial) {
    return (
      <View style={styles.containerLoading}>
        <BuffaloLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <RotateLeftIcon width={24} height={24} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notificações</Text>

        <View style={styles.headerButton} />
      </View>

      {/* CONTEÚDO */}
      <MainLayout>
        <AlertasPendentes
          idPropriedade={propriedadeSelecionada!.toString()}
        />
      </MainLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#222",
  },

  header: {
    height: 80,
    backgroundColor: colors.yellow.base,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.yellow.dark,
  },

  headerButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.brown.base,
  },

  containerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
});
