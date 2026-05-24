import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList, ActivityIndicator, TextInput} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FloatingAction } from 'react-native-floating-action';

import { MainLayout } from '../layouts/MainLayout';
import { useDimensions } from '../utils/useDimensions';
import { colors } from '../styles/colors';
import Plus from '../../assets/images/plus.svg';
import Scanner from '../../assets/images/qr-scan.svg';
import { usePropriedade } from '../context/PropriedadeContext';
import bufaloService from '../services/bufaloService';
import Button from '../components/Button';
import { CardBufalo } from '../components/CardBufaloRebanho';
import FiltroRebanho from '../components/SearchBar';
import { CadastrarBufaloForm } from '../components/CriaBufaloBottomSheet';
import BuffaloLoader from '../components/BufaloLoader';
import IconFiltro from '../../assets/images/agrocore.svg';
type Animal = {
  id: string;
  nome: string;
  brinco: string;
  status: boolean;
  sexo: "F" | "M";
  maturidade?: string;
  raca?: string;
};

type Filtros = {
  brinco?: string;
  sexo?: "M" | "F";
  nivel_maturidade?: "B" | "N" | "V" | "T";
  status?: boolean;
  id_raca?: string;
};

type RootStackParamList = {
  MainTab: undefined;
  AnimalDetail: { id: string };
  RebanhoScreen: { lidas?: string[] }; 
  NfcScannerScreen: undefined;
};


export const RebanhoScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RebanhoScreen'>>();
  const { wp, hp } = useDimensions();
  const { propriedadeSelecionada } = usePropriedade();
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [animaisFiltrados, setAnimaisFiltrados] = useState<Animal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [tagsRecebidas, setTagsRecebidas] = useState<string[]>([]); 

  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtros, setFiltros] = useState<Filtros>({});
  const [selectedZootec, setSelectedZootec] = useState<any>(null);

  const [showFiltro, setShowFiltro] = useState(false);
  const [searchText, setSearchText] = useState("");

  const fetchBufalosFiltrados = async (
    filtrosAplicados: any = {},
    page = 1,
    isInitial = false
  ) => {
    try {
      if (!propriedadeSelecionada) return;

      if (isInitial) {
        setInitialLoading(true);
      } else {
        setListLoading(true);
      }

      const { bufalos, meta } = await bufaloService.filtrarBufalos(
        propriedadeSelecionada,
        filtrosAplicados,
        page
      );

      const animaisFormatados = bufalos.map((b: any) => ({
        id: b.id ?? b.idBufalo,
        status: b.status,
        brinco: b.brinco,
        nome: b.nome,
        raca: b.raca?.nome ?? "Sem raça definida",
        sexo: b.sexo,
        maturidade: b.nivelMaturidade,
        categoria: b.categoria
      }));

      setAnimais(animaisFormatados);
      setAnimaisFiltrados(animaisFormatados);
      setPaginaAtual(meta.page);
      setTotalPaginas(meta.totalPages);

    } catch (err) {
      console.error("Erro ao buscar búfalos:", err);
    } finally {
      setInitialLoading(false);
      setListLoading(false);
    }
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBufalosFiltrados(paginaAtual);
    setRefreshing(false);
  };

  useEffect(() => {
    if (propriedadeSelecionada) {
      fetchBufalosFiltrados({}, 1, true);
    }
  }, [propriedadeSelecionada]);

  useEffect(() => {
    if (!propriedadeSelecionada || initialLoading) return;
    fetchBufalosFiltrados(filtros, 1);
  }, [filtros]);

  useEffect(() => {
    if (route.params?.lidas && route.params.lidas.length > 0) {
        setTagsRecebidas(route.params.lidas);
        
        console.log("Tags lidas recebidas. Processando busca de animais...");
        navigation.setParams({ lidas: undefined });
    }
  }, [route.params?.lidas]);

  const handlePageChange = async (novaPagina: number) => {
    if (novaPagina < 1 || novaPagina > totalPaginas) return;
    await fetchBufalosFiltrados(novaPagina);
  };


  const actions = [
    {
      text: "Novo Animal",
      icon: <Plus width={24} height={24} fill="black" />, // Use seu SVG aqui
      name: "NovoAnimal",
      position: 1,
      color: colors.brand.primary,
    },
    {
      text: "Scanner NFC",
      icon: <Scanner width={24} height={24} fill="black" />,
      name: "NfcScanner",
      position: 2,
      color: colors.brand.primary,
    },
  ];
  const handleActionPress = (name: string | undefined) => {
    if (name === "NovoAnimal") {
      setSelectedZootec(true);
    } else if (name === "NfcScanner") {
      navigation.navigate('NfcScannerScreen');
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setFiltros(prev => ({
        ...prev,
        brinco: searchText.trim() || undefined
      }));
    }, 800); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

  const handleQuickSearch = (text: string) => {
    setSearchText(text);
  };
  
  if (initialLoading) {
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
          <Text style={styles.header1Text}>REBANHO</Text>
        </View>
      </View>

      <MainLayout>
        <FlatList
          data={listLoading ? [] : animaisFiltrados}
          keyExtractor={(item, index) =>
            String(item.id || index)
          }
          showsVerticalScrollIndicator={false}

          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.brand.primary]}
              tintColor={colors.brand.primary}
            />
          }

          ListHeaderComponent={
            <View style={styles.card}>
              <View style={styles.searchBarRow}>
                <View style={styles.searchContainer}>
                  <TextInput 
                    placeholder="Buscar brinco..." 
                    value={searchText}
                    onChangeText={handleQuickSearch}
                    style={styles.searchInput}
                  />
                </View>
                <TouchableOpacity 
                  style={styles.filterButton} 
                  onPress={() => setShowFiltro(true)}
                >
                  <IconFiltro width={24} height={24} fill={colors.text.accent} />
                </TouchableOpacity>
              </View>
            </View>
          }

          renderItem={({ item }) => {
            return (
              <CardBufalo
                nome={item.nome}
                brinco={item.brinco}
                status={item.status}
                sexo={item.sexo}
                maturidade={item.maturidade || "Desconhecida"}
                raca={item.raca}
                categoria={item.categoria}
                onPress={() =>
                  navigation.navigate("AnimalDetail", { id: item.id })
                }
              />
            );
          }}


          ListEmptyComponent={
            listLoading ? (
              <View style={styles.inlineLoader}>
                <ActivityIndicator size="large" color={colors.brand.primary} />
                <Text style={{ marginTop: 8 }}>
                  Atualizando rebanho...
                </Text>
              </View>
            ) : (
              <Text style={{ textAlign: "center", marginTop: 20 }}>
                Nenhum animal encontrado
              </Text>
            )
          }

          ListFooterComponent={
            listLoading ? null : (
              <View style={styles.pagination}>
                <Button
                  title="Anterior"
                  onPress={() => handlePageChange(paginaAtual - 1)}
                  disabled={paginaAtual === 1}
                />

                <Text style={styles.pageInfo}>
                  Página {paginaAtual} de {totalPaginas}
                </Text>

                <Button
                  title="Próxima"
                  onPress={() => handlePageChange(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas}
                />
              </View>
            )
          }
        />
      </MainLayout>

      <FloatingAction
        visible={!listLoading}
        actions={actions}
        onPressItem={handleActionPress}
        buttonSize={60}
        color={colors.brand.primary}
        floatingIcon={<Plus width={24} height={24} fill={'black'} />}
        position="right"
      />

        {!!selectedZootec && (
          <CadastrarBufaloForm 
            key={selectedZootec.id_zootec}
            onClose={() => setSelectedZootec(null)} 
          />
        )}

        {showFiltro && (
        <FiltroRebanho 
          filtros={filtros}
          onFiltrar={(filtrosDoModal) => {
            const novoFiltroCompleto = {
              ...filtrosDoModal,
              brinco: searchText 
            };
            setFiltros(novoFiltroCompleto);
          }}
          onClose={() => setShowFiltro(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1
   },
  card: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1000
  },
  containetSearch: { 
    flex: 1, 
   },
  header: {
    height: 60,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    paddingLeft: 16,
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
  header1Text: {
    marginTop: 10,
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
    color: colors.text.accent,
  },
  headerButtons: { 
    marginTop: 25, 
    flexDirection: "row", 
    position: "absolute", 
    right: 20, 
    gap: 20 
  },
  button: {
    backgroundColor: colors.brand.dark,
    borderRadius: 50
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
    marginBottom: 40,
    gap: 8,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  tagConfirmationBox: {
    backgroundColor: colors.status.successActive,
    borderColor: colors.status.successActive,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  tagConfirmationText: {
    fontWeight: 'bold',
    color: colors.status.successActive,
  },
    fabMain: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: colors.brand.primary,
  },

  fabChild: {
    position: 'absolute',
    right: 16,
    backgroundColor: colors.brand.dark,
  },

  inlineLoader: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },

  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  searchContainer: {
    flex: 1,
    height: 50,
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.border.default,
    justifyContent: 'center',
  },
  searchInput: { 
    fontSize: 16, 
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  }
});