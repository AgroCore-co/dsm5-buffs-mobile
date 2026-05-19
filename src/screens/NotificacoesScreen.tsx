import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";

import AlertasPendentes from "../components/Lembretes";
import { colors } from "../styles/colors";
import { MainLayout } from "../layouts/MainLayout";
import BuffaloLoader from "../components/BufaloLoader";
import RotateLeftIcon from "../icons/arrow";

import { usePropriedade } from "../context/PropriedadeContext";
import { useNavigation } from "@react-navigation/native";
import ArrowLeftIcon from "../icons/arrowLeft";

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
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ALERTAS</Text>
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
  },
  header: {
    height: 60,
    backgroundColor: colors.brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomColor: colors.brand.dark,
    borderBottomWidth: 2.5,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },

  headerButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12
  },

  headerTitle: {
    flex: 1,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
    color: colors.text.accent,
    marginRight: 48,
    marginTop: 10
  },

  containerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg.subtle,
  },
});
