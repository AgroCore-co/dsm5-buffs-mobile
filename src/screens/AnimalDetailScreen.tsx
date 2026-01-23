import React, { useEffect, useState } from "react";
import { View, FlatList, RefreshControl, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { colors } from "../styles/colors";
import { Tabs } from "../components/Tabs";
import { AnimalInfoCard } from "../components/AnimalInfoCard";
import { ZootecnicoCard } from "../components/ZootecnicoCard";
import { SanitarioCard } from "../components/SanitarioCard";
import bufaloService from "../services/bufaloService";
import zootecnicoService from "../services/zootecnicoService";
import sanitarioService from "../services/sanitarioService";
import { MainLayout } from "../layouts/MainLayout";
import Back from '../../assets/images/arrow.svg';
import AgroCore from '../../src/icons/agroCore'; 
import Button from "../components/Button";
import { ZootecnicoBottomSheet } from "../components/ZootecnicoBottomSheet"; 
import { SanitarioBottomSheet } from "../components/SanitarioBottomSheet";
import { AnimalEditBottomSheet } from "../components/AnimalEditBottomSheet";
import { usePropriedade } from "../context/PropriedadeContext";
import { SanitarioAddBottomSheet } from "../components/SanitarioAddBottomSheet";
import { ZootecnicoAddBottomSheet } from "../components/ZootecnicoAddBottomSheet";
import Plus from '../../assets/images/plus.svg';
import BuffaloLoader from "../components/BufaloLoader";

type RootStackParamList = {
  AnimalDetail: { id: string };
};

type NivelMaturidade = 'B' | 'N' | 'V' | 'T';

interface BufaloDetalhes {
    id_bufalo: number;
    nome: string;
    brinco: string;
    sexo: 'F' | 'M';
    nivel_maturidade: NivelMaturidade;
    dt_nascimento: string;
    racaNome: string;
    id_raca: number;
    paiNome?: string;
    maeNome?: string;
}

interface Grupo {
    id_grupo: string; // Tipo conforme o grupoService/API
    nome_grupo: string; // Tipo conforme o grupoService/API
    color: string;
}

type AnimalDetailRouteProp = RouteProp<RootStackParamList, "AnimalDetail">;

export const AnimalDetailScreen = () => {
  const route = useRoute<AnimalDetailRouteProp>();
  const { id } = route.params;
  const navigation = useNavigation<{ goBack: () => void }>();
  const [tab, setTab] = useState<"info" | "zootec" | "sanit">("info");
  const [detalhes, setDetalhes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { propriedadeSelecionada } = usePropriedade();
  
  const PAGE_SIZE = 10;
  const [pageZootec, setPageZootec] = useState(1);
  const [totalPagesZootec, setTotalPagesZootec] = useState(1);
  const [pageSanit, setPageSanit] = useState(1); 
  const [totalPagesSanit, setTotalPagesSanit] = useState(1); 

  const [selectedZootec, setSelectedZootec] = useState<any>(null);
  const [selectedSanit, setSelectedSanit] = useState<any>(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  const [isAddingZootecnico, setIsAddingZootecnico] = useState(false);
  const [isAddingSanitario, setIsAddingSanitario] = useState(false);

  const fetchData = async (
    pageZootecToLoad = pageZootec, 
    pageSanitToLoad = pageSanit
  ) => {
    setLoading(true);
    try {
      const base = await bufaloService.getBufaloDetalhes(id);
      
      const zootResp = await zootecnicoService.getHistorico(id, pageZootecToLoad, PAGE_SIZE);
      setTotalPagesZootec(zootResp.meta?.totalPages ?? 1);
      
      const sanitResp = await sanitarioService.getHistorico(id, pageSanitToLoad, PAGE_SIZE);
      setTotalPagesSanit(sanitResp.meta?.totalPages ?? 1);

      setDetalhes({
        ...base,
        dadosZootecnicos: zootResp.data || [],
        dadosSanitarios: sanitResp.data || [],
      });

    } catch (err) {
      console.error("Erro ao buscar dados do búfalo:", err);
    } finally {
      setLoading(false);
    }
  };

  const changePageZootec = (newPage: number) => {
    setPageZootec(newPage);
    fetchData(newPage, pageSanit);
  }
  
  const changePageSanit = (newPage: number) => {
    setPageSanit(newPage);
    fetchData(pageZootec, newPage); 
  }

  const onRefresh = async () => {
    setRefreshing(true);
    setPageZootec(1);
    setPageSanit(1);
    await fetchData(1, 1);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);



  const handleSaveZootecnico = async (data: any) => {
    console.log("Salvando alterações do registro Zootec:", data);
    const { id_zootec, ...payload } = data;
    if (!id_zootec) {
        console.error("ID do registro zootécnico não encontrado.");
        return;
    }
    try {
        await zootecnicoService.update(id_zootec, payload); 
        setSelectedZootec(null); 
        await fetchData(pageZootec, pageSanit);
    } catch (error) {
        console.error("Erro ao atualizar histórico Zootécnico:", error);
    }
  };

  const handleDeleteZootecnico = async (id_zootec: any) => {
    try {
      if (!id_zootec) {
        console.error("ID do registro zootécnico para exclusão não encontrado.");
        return;
      }
      await zootecnicoService.delete(id_zootec); 
      setSelectedZootec(null); 
      setPageZootec(1);
      await fetchData(1, pageSanit); 
    } catch (error) {
      console.error("Erro ao excluir histórico Zootécnico:", error);
    }
  };

  const handleSaveSanitario = async (data: any) => {
    console.log("Salvando alterações do registro Sanit:", data);
    const { id_sanit, ...payload } = data;
    if (!id_sanit) {
        console.error("ID do registro sanitario não encontrado.");
        return;
    }
    try {
        await sanitarioService.update(id_sanit, payload); 
        setSelectedSanit(null); 
        await fetchData(pageSanit, pageZootec);
    } catch (error) {
        console.error("Erro ao atualizar histórico Sanitário:", error);
    }
  };

  const handleDeleteSanitario = async (id_sanit: any) => {
    try {
      if (!id_sanit) {
        console.error("ID do registro sanitario para exclusão não encontrado.");
        return;
      }
      await sanitarioService.delete(id_sanit); 
      setSelectedSanit(null); 
      setPageSanit(1);
      await fetchData(1, pageZootec); 
    } catch (error) {
      console.error("Erro ao excluir histórico sanitario:", error);
    }
  };

  const handleSaveInfo = async (id_bufalo: number, dadosAtualizados: any) => {
    try {
      await bufaloService.updateBufalo(id_bufalo, dadosAtualizados); 
      setIsEditingInfo(false); // Fecha o BottomSheet usando o estado da tela
      await fetchData(); // Recarrega os dados para atualizar a tela
    } catch (error) {
      console.error("Erro ao salvar informações do animal AQUI:", error);
    }
  };

  const handleAddZootecnico = async (payload: any) => {
    try {
        await zootecnicoService.add(id, payload);
        setIsAddingZootecnico(false);
        setPageZootec(1);
        await fetchData(1, pageSanit);
    } catch (error) {
        console.error("Erro ao adicionar histórico Zootécnico:", error);
    }
  };

  const handleAddSanitario = async (payload: any) => {
    try {
        // id_bufalo deve ser incluído no payload para a API Sanitária
        await sanitarioService.add({ ...payload, id_bufalo: id });
        setIsAddingSanitario(false);
        setPageSanit(1);
        await fetchData(pageZootec, 1);
    } catch (error) {
        console.error("Erro ao adicionar histórico Sanitário:", error);
    }
  };


  const PaginationComponent = ({ 
    paginaAtual, 
    totalPaginas, 
    onPageChange,
    isLoading
  }: {
    paginaAtual: number,
    totalPaginas: number,
    onPageChange: (page: number) => void,
    isLoading: boolean
  }) => (
    <View style={styles.pagination}>
      <Button
          title="Anterior"
          onPress={() => onPageChange(paginaAtual - 1)}
          disabled={paginaAtual === 1 || isLoading}
        />
        <Text style={styles.pageInfo}>Página {paginaAtual} de {totalPaginas}</Text>
        <Button
          title="Próxima"
          onPress={() => onPageChange(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas || isLoading}
        />
    </View>
  );

  if (loading && !detalhes) {
    return (
      <View style={styles.loadingContainer}>
        <BuffaloLoader />
      </View>
    );
  }

  const tabOptions = [
    { key: "info", label: "Informações" },
    { key: "zootec", label: "Zootécnico" },
    { key: "sanit", label: "Sanitário" },
  ];

  const showAddButton = tab === "zootec" || tab === "sanit";

  const onAddPress = () => {
      if (tab === "zootec") {
          setIsAddingZootecnico(true);
      } else if (tab === "sanit" && propriedadeSelecionada) {
          setIsAddingSanitario(true);
      }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ alignItems: 'center', flexDirection: 'row', alignContent: 'center', marginTop: 20, gap: 60 }}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Back width={25} height={25} style={{ margin: 6 }} />
          </TouchableOpacity>
          <Text style={styles.header1Text}>Prontuário: {detalhes?.brinco || 'N/A'}</Text>
        </View>
      </View>

      <MainLayout>     
        <Tabs 
          tabs={tabOptions} 
          activeTab={tab}   
          onChange={(key: string) => {
            if (key === "info" || key === "zootec" || key === "sanit") {
              setTab(key);
            }
          }} 
        />

        <View style={styles.cardContainer}>
          
          {tab === "info" && detalhes && <AnimalInfoCard detalhes={detalhes} onEdit={() => setIsEditingInfo(true)} />}
          
          {tab === "zootec" && (
            <FlatList
              data={detalhes?.dadosZootecnicos || []}
              keyExtractor={(item) => item.id_zootec.toString()}
              renderItem={({ item }) => (
                <ZootecnicoCard item={item} onPress={() => setSelectedZootec(item)} />
              )}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={<Text style={styles.emptyText}>Nenhum registro Zootécnico encontrado.</Text>}
              ListFooterComponent={() =>
                (detalhes?.dadosZootecnicos.length > 0) && totalPagesZootec > 0 ? (
                  <PaginationComponent 
                    paginaAtual={pageZootec}
                    totalPaginas={totalPagesZootec}
                    onPageChange={changePageZootec}
                    isLoading={loading}
                  />
                ) : null
              }
            />
          )}
          
          {tab === "sanit" && (
              <FlatList
                data={detalhes?.dadosSanitarios || []}
                keyExtractor={(item) => item.id_sanit.toString()}
                renderItem={({ item }) => (
                  <SanitarioCard item={item} onPress={() => setSelectedSanit(item)} />
                )}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
                }
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum registro Sanitário encontrado.</Text>}
                ListFooterComponent={() =>
                  (detalhes?.dadosSanitarios.length > 0) && totalPagesSanit > 0 ? (
                  <PaginationComponent 
                    paginaAtual={pageSanit}
                    totalPaginas={totalPagesSanit}
                    onPageChange={changePageSanit}
                    isLoading={loading}
                      />
                    ) : null
                }
              />
            )}
            
        </View>
        
        {/* Renderização do BottomSheet com a correção de boas práticas */}
        {!!selectedZootec && (
            <ZootecnicoBottomSheet 
                // A chave força a remontagem quando um NOVO item é selecionado, 
                // garantindo que o index={0} seja respeitado na montagem.
                key={selectedZootec.id_zootec}
                item={selectedZootec} 
                onClose={() => setSelectedZootec(null)} 
                onEditSave={handleSaveZootecnico}
                onDelete={handleDeleteZootecnico}
            />
        )}
        
        {!!selectedSanit && propriedadeSelecionada &&(
        <SanitarioBottomSheet 
              key={selectedSanit.id_sanit}
              item={selectedSanit} 
              onClose={() => setSelectedSanit(null)} 
              onEditSave={handleSaveSanitario}
              propriedadeId={propriedadeSelecionada}
              onDelete={handleDeleteSanitario}
        />    
        )}

        {!!isEditingInfo && detalhes && (
            <AnimalEditBottomSheet 
                item={detalhes as BufaloDetalhes} 
                onClose={() => setIsEditingInfo(false)} 
                onEditSave={handleSaveInfo}
            />
        )}

      </MainLayout> 

      {showAddButton && (
          <View style={styles.addButtonContainer}>
              <TouchableOpacity style={styles.floatingButton} onPress={onAddPress}>
                <Text style={{padding:18}}><Plus width={24} height={24} fill={'black'} /></Text>
              </TouchableOpacity>
          </View>
      )}

          {isAddingZootecnico && (
            <ZootecnicoAddBottomSheet
                id_bufalo={id}
                onClose={() => setIsAddingZootecnico(false)}
                onAddSave={handleAddZootecnico}
            />
        )}

        {isAddingSanitario && propriedadeSelecionada && (
            <SanitarioAddBottomSheet
                id_bufalo={id}
                propriedadeId={propriedadeSelecionada}
                onClose={() => setIsAddingSanitario(false)}
                onAddSave={handleAddSanitario}
            />
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.gray.disabled 
  },
  headerButton: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    headerArrow: {
      fontSize: 28,
      fontWeight: '300',
      color: colors.brown.base,
    },
  cardContainer: {
    borderTopWidth: 2, 
    borderColor: colors.gray.disabled, 
    paddingTop: 16, 
    marginTop: 10,
    flex: 1
  },
  header: { 
    height: 80, 
    backgroundColor: colors.yellow.base, 
    justifyContent: 'center', 
    paddingLeft: 16 
  },
  header1Text: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: colors.brown.base 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  emptyText: { 
    textAlign: "center", 
    color: colors.gray.base, 
    marginTop: 20 
  },
  pageInfo: {
    marginHorizontal: 12,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 8,
    marginBottom: 40
  },
  addButtonContainer: {
    position: 'absolute', 
    bottom: 24, 
    right: 24, 

  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30, 
    backgroundColor: colors.yellow.base, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});