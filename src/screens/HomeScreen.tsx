import React, { useState, useEffect} from "react";
import { View, FlatList, StyleSheet, RefreshControl, Text, ActivityIndicator } from "react-native";
import Propriedades from "../components/SelectPropriedade";
import DashPropriedade from "../components/DashPropriedade";
import { colors } from "../styles/colors";
import BuffsLogo from '../../assets/images/logoBuffs.svg'; 
import { MainLayout } from "../layouts/MainLayout";
import { UserMenu } from "../components/UserMenu";
import BuffaloLoader from "../components/BufaloLoader";

import { usePropriedade } from "../context/PropriedadeContext";
import propriedadeService from "../services/propriedadeService";
import { NotificacoesButton } from "../components/NotificacoesButton";


export const HomeScreen = () => {
  const { propriedadeSelecionada } = usePropriedade();
  const [propriedades, setPropriedades] = useState<any[]>([]); 
  const [dashboard, setDashboard] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [countsSex, setCountsSex] = useState({ machos: 0, femeas: 0 });
  const [countsMat, setCountsMat] = useState({ bezerros: 0, novilhas: 0, vacas: 0, touros: 0 });
  const [count, setCount] = useState({ bufalosAtivos: 0 });

  const fetchPropriedades = async () => {
    try {
      const { propriedades } = await propriedadeService.getPropriedades();
      setPropriedades(propriedades);
    } catch (err) {
      console.error("Erro ao buscar propriedades:", err);
    }
  };

  const fetchDashboard = async () => {
    if (!propriedadeSelecionada) return;
    try {
      const { dashboard } = await propriedadeService.getDashboardPropriedade(propriedadeSelecionada);
      setDashboard(dashboard);
      setCountsSex({ machos: dashboard?.machos, femeas: dashboard?.femeas });
      setCountsMat({
        bezerros: dashboard?.bezerros,
        novilhas: dashboard?.novilhas,
        vacas: dashboard?.vacas,
        touros: dashboard?.touros,
      });
      setCount({ bufalosAtivos: dashboard?.bufalosAtivos });
    } catch (err) {
      console.error("Erro ao buscar búfalos:", err);
    }
  }; 
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard(),
    setRefreshing(false);
  };
  
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchPropriedades();
      await fetchDashboard();
      setLoading(false);
    };

    loadInitialData();
  }, [propriedadeSelecionada]);

  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <View style={{alignItems: 'center', top: -5}}>
            <BuffsLogo width={100} height={100} />
          </View>
          <View style={{position: 'absolute', right: 60, top: 10}}>
            <UserMenu />
          </View>
          <View style={{position: 'absolute', left: 70, top: -20}}>
            <NotificacoesButton />
          </View>
      </View>
      <MainLayout>
        <FlatList
          data={[{}]}
          keyExtractor={(_, index) => index.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <>
              <Propriedades prop={propriedades} />
              {loading || !dashboard ? (
                <View style={styles.loading}>
                  <BuffaloLoader />
                </View>
              ) : (
                <DashPropriedade
                  total={count.bufalosAtivos}
                  machos={countsSex.machos}
                  femeas={countsSex.femeas}
                  bezerros={countsMat.bezerros}
                  novilhas={countsMat.novilhas}
                  vacas={countsMat.vacas}
                  touros={countsMat.touros}
                />
              )}
            </>
          }
          renderItem={null}
        />
      </MainLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222'
  },
  header: {
    height: 60,
    backgroundColor: colors.yellow.base,
    justifyContent: 'center',
    paddingLeft: 16,
    paddingTop: 20,
    borderColor: colors.yellow.dark
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  button: {
    backgroundColor: colors.yellow.dark,
    borderRadius: 50,
  },
  loading: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
  }
});
