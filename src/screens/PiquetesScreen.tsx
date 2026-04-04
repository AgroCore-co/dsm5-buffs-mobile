import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { MainLayout } from '../layouts/MainLayout';
import { useDimensions } from '../utils/useDimensions';
import { colors } from '../styles/colors';
import Plus from '../../assets/images/plus.svg';
import { MapLeaflet } from '../components/Mapa';
import { piqueteService, Piquete } from "../services/piqueteService";
import { usePropriedade } from "../context/PropriedadeContext";
import AgroCore from '../icons/agroCore';
import { DemarcacaoPiqueteSheet } from '../components/DemarcacaoPiqueteSheet'; 
import { useGpsLocation } from '../hooks/useLocation';
import BuffaloLoader from '../components/BufaloLoader';


export const PiquetesScreen = () => {
  const { wp, hp } = useDimensions();
  const [piquetes, setPiquetes] = useState<Piquete[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { location: currentLocation, loading: gpsLoading, error: gpsError } = useGpsLocation();
  const { propriedadeSelecionada } = usePropriedade();
  useEffect(() => {
    const fetchPiquetes = async () => {
      try {
        if (!propriedadeSelecionada) return; 
        const data = await piqueteService.getAll(propriedadeSelecionada.toString());
        setPiquetes(data);
      } catch (error) {
        console.error("Erro ao buscar piquetes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPiquetes();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    if (propriedadeSelecionada) {
      const data = await piqueteService.getAll(propriedadeSelecionada.toString());
      setPiquetes(data);
    }
    setRefreshing(false);
  };

  const handleOpenSheet = () => {
    setIsSheetOpen(true);
  };

const handleCloseSheet = () => {
    setIsSheetOpen(false);
    onRefresh(); 
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
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.header1Text}>Lotes/Piquetes</Text>
        </View>
      </View>

      <MainLayout>
          <ScrollView style={{ flex: 1, top: 30 }} refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <MapLeaflet
              piquetes={piquetes.map(p => ({
                ...p,
                color: p.grupoCor,
              }))} currentLocation={currentLocation}            />
            <TouchableOpacity 
                onPress={handleOpenSheet} // Chamando a função para abrir
                style={{
                  position: 'absolute',
                  bottom: 20,
                  right: 16,
                  backgroundColor: colors.yellow.dark,
                  borderRadius: 30,
                  paddingHorizontal: 20,
                  height: 65,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 5
              }}>
            <Plus width={24} height={24} />
          </TouchableOpacity>
          </ScrollView>
        {isSheetOpen && propriedadeSelecionada && (<DemarcacaoPiqueteSheet onClose={handleCloseSheet} propriedadeId={propriedadeSelecionada} />)}
      </MainLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 80,
    backgroundColor: colors.yellow.base,
    justifyContent: 'center',
    paddingLeft: 16,
  },
  button: {
    backgroundColor: colors.yellow.dark,
    borderRadius: 50,
  },
  header1Text: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 30,
    color: colors.brown.base,
  },
  headerButtons: {
    marginTop: 25,
    flexDirection: 'row',
    position: 'absolute',
    right: 20,
    gap: 20,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.gray.disabled,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
});
