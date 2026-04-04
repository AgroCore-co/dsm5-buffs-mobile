import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from "react-native";

import { colors } from "../styles/colors";
import DashLactation from "../components/DashLactacao";
import { MainLayout } from "../layouts/MainLayout";
import Bucket from "../../assets/images/bucket.svg";
import Truck from "../../assets/images/truck-side.svg";
import Plus from "../../assets/images/plus.svg";

import { getCiclosLactacao, getEstatisticasLactacao, getIndustriasPorPropriedade, getProducaoDiariaAtual } from "../services/lactacaoService";
import { ColetaAddBottomSheet } from "../components/FormColeta";
import { CardLactacao } from "../components/CardBufaloLactacao";
import { usePropriedade } from "../context/PropriedadeContext";
import Button from "../components/Button";
import { LactacaoAddBottomSheet } from "../components/FormLactacao";
import { FloatingAction } from "react-native-floating-action";
import { EstoqueAddBottomSheet } from "../components/FormEstoque";
import BuffaloLoader from "../components/BufaloLoader";
import { formatarDataBR } from "../utils/date";

export interface AnimalLac {
  id: string;
  brinco: string;
  nome: string;
  diasEmLactacao: number;
  secagemPrevista?: string;
  cicloAtual?: number;
  producaoTotal?: number;
  status: string;
  raca?: string;
  idCicloLactacao?: string;
}

export const LactacaoScreen = () => {
  const { propriedadeSelecionada } = usePropriedade();

  const [animais, setAnimais] = useState<AnimalLac[]>([]);
  const [totalLactando, setTotalLactando] = useState(0);
  const [quantidadeAtual, setQuantidadeAtual] = useState(0);
  const [dataFormatada, setDataFormatada] = useState<string>("N/D");

  const [industrias, setIndustrias] = useState<any[]>([]);
  const [selectedBufala, setSelectedBufala] = useState<AnimalLac | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  

  const [isAddingEstoque, setIsAddingEstoque] = useState(false);
  const [isAddingColeta, setIsAddingColeta] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const itensPorPagina = 10;


  /* =======================
     BUSCA CICLOS
  ======================== */
const fetchCiclos = async (page = 1, isInitial = false) => {
  if (!propriedadeSelecionada) return;

  try {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setListLoading(true);
    }

    const { ciclos, meta } = await getCiclosLactacao(
      propriedadeSelecionada,
      page,
      itensPorPagina
    );

    const animaisFormatados: AnimalLac[] = ciclos.map((c: any) => ({
      id: c.idBufala,
      nome: c.nome,
      brinco: c.brinco,
      status: c.status,
      secagemPrevista: c.dtSecagemPrevista,
      diasEmLactacao: c.diasEmLactacao,
      producaoTotal: 0,
      raca: c.raca,
      idCicloLactacao: c.idCicloLactacao,
      cicloAtual: c.cicloAtual,
    }));

    setAnimais(animaisFormatados);
    setPaginaAtual(meta.page);
    setTotalPaginas(meta.totalPages);
  } catch (error) {
    console.error("Erro ao buscar ciclos:", error);
  } finally {
    setInitialLoading(false);
    setListLoading(false);
  }
};  

  const fetchProducaoAtual = async () => {
    if (!propriedadeSelecionada) return;

    try {
      const { quantidade, dataAtualizacao } =
        await getProducaoDiariaAtual(propriedadeSelecionada);

      setQuantidadeAtual(quantidade);
      setDataFormatada(dataAtualizacao);
    } catch (error) {
      console.error("Erro ao buscar produção diária:", error);
    }
  };


  const fetchEstatisticas = async () => {
    if (!propriedadeSelecionada) return;

    try {
      const stats = await getEstatisticasLactacao(propriedadeSelecionada);

      setTotalLactando(stats.ciclos_ativos ?? 0);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };


  /* =======================
     BUSCA INDÚSTRIAS
  ======================== */
  const fetchIndustrias = async () => {
    if (!propriedadeSelecionada) return;
    try {
      const response = await getIndustriasPorPropriedade(propriedadeSelecionada);
      setIndustrias(response);
    } catch (error) {
      console.error("Erro ao buscar indústrias:", error);
      setIndustrias([]);
    }
  };

  useEffect(() => {
    if (propriedadeSelecionada) {
      fetchCiclos(1, true);
      fetchEstatisticas();
      fetchProducaoAtual();
      fetchIndustrias();
    }
  }, [propriedadeSelecionada]);


  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCiclos(1),
      fetchEstatisticas(),
      fetchProducaoAtual(),
      fetchIndustrias(),
    ]);
    setRefreshing(false);
  };


  const animaisPaginados = animais.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  const actions = [
    {
      text: "Atualizar Estoque",
      icon: <Bucket width={18} height={18} />,
      name: "estoque",
      position: 1,
      color: colors.yellow.base,
    },
    {
      text: "Registrar Coleta",
      icon: <Truck width={15} height={15} />,
      name: "coleta",
      position: 2,
      color: colors.yellow.base,
    },
  ];

  const handleActionPress = (name?: string) => {
    if (name === "estoque") setIsAddingEstoque(true);
    if (name === "coleta") setIsAddingColeta(true);
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
      <View style={styles.header}>
        <Text style={styles.headerText}>Lactação</Text>
      </View>

      <MainLayout>
        <FlatList
          data={listLoading ? [] : animais}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CardLactacao
              animal={item}
              onPress={() => setSelectedBufala(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.yellow.base]}
            />
          }
          ListHeaderComponent={
            <DashLactation
              totalArmazenado={quantidadeAtual}
              vacasLactando={totalLactando}
              dataAtualizacao={dataFormatada}
            />
          }
          ListEmptyComponent={
            listLoading ? (
              <View style={styles.inlineLoader}>
                <ActivityIndicator size="large" color={colors.yellow.base} />
                <Text style={{ marginTop: 8 }}>
                  Atualizando lactação...
                </Text>
              </View>
            ) : (
              <Text style={{ textAlign: "center", marginTop: 20 }}>
                Nenhum animal encontrado
              </Text>
            )
          }

          ListFooterComponent={
            listLoading ? (
              <View style={styles.footerLoader}>
                
              </View>
            ) : (
              <View style={styles.pagination}>
                <Button
                  title="Anterior"
                  onPress={() => {
                    if (paginaAtual > 1) fetchCiclos(paginaAtual - 1);
                  }}
                  disabled={paginaAtual === 1}
                />

                <Text style={styles.pageInfo}>
                  Página {paginaAtual} de {totalPaginas}
                </Text>

                <Button
                  title="Próxima"
                  onPress={() => {
                    if (paginaAtual < totalPaginas)
                      fetchCiclos(paginaAtual + 1);
                  }}
                  disabled={paginaAtual === totalPaginas}
                />
              </View>
            )
          }

        />
      </MainLayout>

      <FloatingAction
        actions={actions}
        onPressItem={handleActionPress}
        buttonSize={60}
        color={colors.yellow.dark}
        floatingIcon={<Plus width={24} height={24} />}
      />

      {isAddingEstoque && (
        <EstoqueAddBottomSheet
          propriedadeId={propriedadeSelecionada!}
          onClose={() => setIsAddingEstoque(false)}
          onSuccess={fetchCiclos}
        />
      )}

      {isAddingColeta && (
        <ColetaAddBottomSheet
          industrias={industrias}
          propriedadeId={propriedadeSelecionada!}
          onClose={() => setIsAddingColeta(false)}
        />
      )}

      {!!selectedBufala && (
        <LactacaoAddBottomSheet
          animais={[
            {
              id_bufala: selectedBufala.id,
              brinco: selectedBufala.brinco,
              id_ciclo_lactacao: selectedBufala.idCicloLactacao || "",
            },
          ]}
          propriedadeId={propriedadeSelecionada!}
          onClose={() => setSelectedBufala(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 80,
    backgroundColor: colors.yellow.base,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    marginTop: 30,
    fontSize: 20,
    fontWeight: "bold",
    color: colors.brown.base,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineLoader: {
  height: 200,
  justifyContent: "center",
  alignItems: "center",
  },

  footerLoader: {
    marginVertical: 24,
    alignItems: "center",
  },

  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 40,
    gap: 8,
  },

  pageInfo: {
    marginHorizontal: 12,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },


});
