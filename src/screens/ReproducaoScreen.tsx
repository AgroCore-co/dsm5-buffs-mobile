import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';

import { MainLayout } from '../layouts/MainLayout';
import { colors } from '../styles/colors';
import Plus from '../../assets/images/plus.svg';
import {
  getReproducaoDashboardStats,
  getReproducoes,
  ReproducaoDashboardStats,
} from '../services/reproducaoService';
import DashReproduction from '../components/DashReproducao';
import { CardReproducao } from '../components/CardBufaloReproduction';
import Button from '../components/Button';
import { usePropriedade } from '../context/PropriedadeContext';
import { ReproducaoAddBottomSheet } from '../components/FormReproductionAdd';
import { ReproducaoAttBottomSheet } from '../components/FormReproductionAtt';
import BuffaloLoader from '../components/BufaloLoader';

export const ReproducaoScreen = () => {
  const { propriedadeSelecionada } = usePropriedade();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  const [reproducoes, setReproducoes] = useState<any[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [reproducaoSelecionada, setReproducaoSelecionada] = useState<any>(null);
  const [isAddBottomSheetVisible, setIsAddBottomSheetVisible] = useState(false);
  const [isAttBottomSheetVisible, setIsAttBottomSheetVisible] = useState(false);

  const itensPorPagina = 10;

  const [dashboardStats, setDashboardStats] =
    useState<ReproducaoDashboardStats>({
      totalEmAndamento: 0,
      totalConfirmada: 0,
      totalFalha: 0,
      ultimaDataReproducao: '-',
    });

  const fetchReproducoes = async (
    pagina: number,
    isInitial = false
  ) => {
    if (!propriedadeSelecionada) return;

    try {
      if (isInitial) setLoading(true);
      else setListLoading(true);

      const [stats, dadosLista] = await Promise.all([
        getReproducaoDashboardStats(propriedadeSelecionada),
        getReproducoes(propriedadeSelecionada, pagina, itensPorPagina),
      ]);

      setDashboardStats(stats);
      setReproducoes(dadosLista.reproducoes);
      setTotalPaginas(dadosLista.meta.totalPages);
      setPaginaAtual(pagina);
    } catch (error) {
      console.error(error);
      setReproducoes([]);
      setPaginaAtual(1);
      setTotalPaginas(1);
    } finally {
      setLoading(false);
      setListLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReproducoes(1);
    setRefreshing(false);
  };

  const handlePageChange = async (novaPagina: number) => {
    if (novaPagina < 1 || novaPagina > totalPaginas) return;
    await fetchReproducoes(novaPagina);
  };

  const handleCardPress = (reproducao: any) => {
    setReproducaoSelecionada(reproducao);
    setIsAttBottomSheetVisible(true);
  };

  useEffect(() => {
    if (propriedadeSelecionada) {
      fetchReproducoes(1, true);
    }
  }, [propriedadeSelecionada]);

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
        <Text style={styles.header1Text}>Reprodução</Text>
      </View>

      <MainLayout>
        <FlatList
          data={listLoading ? [] : reproducoes}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}

          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.yellow.base]}
              tintColor={colors.yellow.base}
            />
          }

          ListHeaderComponent={
            <DashReproduction
              emProcesso={dashboardStats.totalEmAndamento}
              confirmadas={dashboardStats.totalConfirmada}
              falhas={dashboardStats.totalFalha}
              ultimaData={
                dashboardStats.ultimaDataReproducao === '-'
                  ? '-'
                  : dashboardStats.ultimaDataReproducao
              }
            />
          }

          renderItem={({ item }) => (
            <CardReproducao
              reproducao={{
                brincoBufala: item.brincoVaca,
                brincoTouro: item.brincoTouro,
                tipoReproducao: item.tipoInseminacao,
                concluida: item.tipoParto,
                dataCruzamento: item.dt_evento,
                previsaoParto: item.previsaoParto,
                status: item.status,
                tipo_parto: item.tipoParto,
                tipo_inseminacao: item.tipoInseminacao,
                id_semen: item.id_semen,
              }}
              onPress={() => handleCardPress(item)}
            />
          )}

          ListEmptyComponent={
            listLoading ? (
              <View style={styles.inlineLoader}>
                <ActivityIndicator
                  size="large"
                  color={colors.yellow.base}
                />
                <Text style={{ marginTop: 8 }}>
                  Atualizando reproduções...
                </Text>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', marginTop: 20 }}>
                Nenhum registro encontrado
              </Text>
            )
          }

          ListFooterComponent={
            totalPaginas > 1 && !listLoading ? (
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
            ) : null
          }
        />
      </MainLayout>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => {
          setReproducaoSelecionada(null);
          setIsAddBottomSheetVisible(true);
        }}
        style={styles.fabButtonContainer}
      >
        <Plus width={24} height={24} color="#FFF" />
      </TouchableOpacity>

      {isAddBottomSheetVisible && (
        <ReproducaoAddBottomSheet
          onClose={() => setIsAddBottomSheetVisible(false)}
          onSuccess={() => {
            setIsAddBottomSheetVisible(false);
            fetchReproducoes(1);
          }}
        />
      )}

      {isAttBottomSheetVisible && reproducaoSelecionada && (
        <ReproducaoAttBottomSheet
          initialData={reproducaoSelecionada}
          onClose={() => {
            setIsAttBottomSheetVisible(false);
            setReproducaoSelecionada(null);
          }}
          onSuccess={() => {
            setIsAttBottomSheetVisible(false);
            fetchReproducoes(paginaAtual);
          }}
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
    justifyContent: 'center',
  },

  header1Text: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 30,
    color: colors.brown.base,
  },

  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },

  pageInfo: {
    marginHorizontal: 12,
    fontWeight: '600',
    color: '#374151',
  },

  fabButtonContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.yellow.dark,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  inlineLoader: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
