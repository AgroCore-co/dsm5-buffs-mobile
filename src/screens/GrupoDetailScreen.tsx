import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { colors } from "../styles/colors";
import BuffaloLoader from "../components/BufaloLoader";
import { CardBufalo } from "../components/CardBufaloRebanho";
import { MapLeaflet } from "../components/Mapa";
import { piqueteService, Piquete } from "../services/piqueteService";
import { getBufalosDoGrupo } from "../services/bufaloService";
import { usePropriedade } from "../context/PropriedadeContext";
import { RootStackParamList } from "../../App";

type RouteProps = RouteProp<RootStackParamList, "GrupoDetailScreen">;

// ─────────────────────────────────────────────────────────────
// Subcomponentes fixos (fora do render para evitar re-montagem)
// ─────────────────────────────────────────────────────────────

interface StatsRowProps {
  total: number;
  qtdMax: number;
  ocupacao: number;
  nomeLote: string;
}

const StatsRow = ({ total, qtdMax, ocupacao, nomeLote }: StatsRowProps) => (
  <View style={styles.statsRow}>
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{total}</Text>
      <Text style={styles.statLabel}>Animais</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{qtdMax || "—"}</Text>
      <Text style={styles.statLabel}>Capacidade</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={[styles.statValue, ocupacao >= 90 && { color: colors.status.error }]}>
        {ocupacao}%
      </Text>
      <Text style={styles.statLabel}>Ocupação</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={[styles.statItem, { flex: 1.6 }]}>
      <Text style={styles.statValue} numberOfLines={1}>{nomeLote || "Sem piquete"}</Text>
      <Text style={styles.statLabel}>Piquete</Text>
    </View>
  </View>
);

interface LoteMapSectionProps {
  lotes: Piquete[];
  grupoId: string;
  grupoColor: string;
}

const LoteMapSection = ({ lotes, grupoId, grupoColor }: LoteMapSectionProps) => {
  // Mesmo padrão do AnimalDetailScreen: find → único lote atual.
  // O servidor atualiza idGrupo do lote quando o grupo se move — então só
  // um lote terá idGrupo === grupoId no estado corrente dos dados sincronizados.
  const loteAtual = lotes.find((l) => l.idGrupo === grupoId) ?? null;
  const temGeometria = (loteAtual?.coords?.length ?? 0) > 0;
  const loteMapeado = loteAtual ? [{ ...loteAtual, color: grupoColor }] : [];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PIQUETE DO GRUPO</Text>

      {temGeometria ? (
        <View style={styles.mapContainer}>
          <MapLeaflet piquetes={loteMapeado} currentLocation={null} />
        </View>
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>
            {loteAtual ? "Piquete sem geometria definida" : "Grupo sem piquete associado"}
          </Text>
        </View>
      )}

      {loteAtual ? (
        <View style={styles.loteInfoCard}>
          <View style={[styles.loteColorBar, { backgroundColor: grupoColor }]} />
          <View style={styles.loteInfoContent}>
            <Text style={styles.loteNome}>{loteAtual.nome}</Text>
            <View style={styles.loteChips}>
              <View style={[styles.chip, { backgroundColor: colors.status.successBg }]}>
                <Text style={[styles.chipText, { color: colors.status.successText }]}>Em uso</Text>
              </View>
              {typeof loteAtual.areaM2 === "number" && loteAtual.areaM2 > 0 && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>
                    {(loteAtual.areaM2 / 10000).toFixed(1)} ha
                  </Text>
                </View>
              )}
              {loteAtual.tipoLote ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{loteAtual.tipoLote}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.loteInfoCard}>
          <Text style={styles.emptyText}>Grupo sem piquete associado</Text>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// GrupoDetailScreen
// ─────────────────────────────────────────────────────────────

export const GrupoDetailScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { grupoId, nomeGrupo, color } = route.params;
  const { propriedadeSelecionada } = usePropriedade();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bufalos, setBufalos] = useState<any[]>([]);
  const [totalBufalos, setTotalBufalos] = useState(0);
  const [lotes, setLotes] = useState<Piquete[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 20;

  const fetchData = useCallback(async (reset = false) => {
    if (!propriedadeSelecionada) return;
    const currentPage = reset ? 1 : page;
    try {
      const [loteData, bufaloData] = await Promise.all([
        piqueteService.getAll(propriedadeSelecionada.toString()),
        getBufalosDoGrupo(propriedadeSelecionada.toString(), grupoId, currentPage, LIMIT),
      ]);

      setLotes(loteData);
      if (reset) {
        setBufalos(bufaloData.bufalos);
        setPage(1);
      } else {
        setBufalos((prev) => [...prev, ...bufaloData.bufalos]);
      }
      setTotalBufalos(bufaloData.meta.total);
      setHasMore(currentPage < bufaloData.meta.totalPages);
    } catch (err) {
      console.error("Erro ao carregar GrupoDetailScreen:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [propriedadeSelecionada, grupoId, page]);

  useEffect(() => {
    fetchData(true);
  }, [propriedadeSelecionada, grupoId]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchData(true);
  };

  const onLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setPage((p) => {
      fetchData(false);
      return p + 1;
    });
  };

  // Mesmo padrão do AnimalDetailScreen: find → único lote atual
  const loteAtivo = lotes.find((l) => l.idGrupo === grupoId) ?? null;

  // Ocupação calculada com base nos bufalos carregados vs qtdMax do lote ativo
  const qtdMax = (loteAtivo as any)?.qtdMax ?? 0;
  const ocupacao = qtdMax > 0 ? Math.min(100, Math.round((totalBufalos / qtdMax) * 100)) : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BuffaloLoader />
      </View>
    );
  }

  const maturidadeMap: Record<string, string> = {
    B: "Bezerro",
    N: "Novilha",
    T: "Touro",
    V: "Vaca",
  };

  const ListHeader = (
    <>
      {/* Stats */}
      <StatsRow
        total={totalBufalos}
        qtdMax={qtdMax}
        ocupacao={ocupacao}
        nomeLote={loteAtivo?.nome ?? ""}
      />

      {/* Mapa + info lote */}
      <LoteMapSection
        lotes={lotes}
        grupoId={grupoId}
        grupoColor={color}
      />

      {/* Título da lista de animais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          ANIMAIS DO GRUPO
          <Text style={styles.sectionCount}> ({totalBufalos})</Text>
        </Text>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <Text style={styles.headerTitle} numberOfLines={1}>{nomeGrupo}</Text>
      </View>

      <FlatList
        data={bufalos}
        keyExtractor={(item) => String(item.idBufalo ?? item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brand.primary]}
            tintColor={colors.brand.primary}
          />
        }
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <CardBufalo
            nome={item.nome ?? "Sem nome"}
            brinco={item.brinco ?? "—"}
            status={item.status === true || item.status === 1}
            sexo={item.sexo ?? "F"}
            maturidade={item.nivelMaturidade ?? ""}
            raca={item.racaNome}
            categoria={maturidadeMap[item.nivelMaturidade] ?? item.nivelMaturidade}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum animal neste grupo</Text>
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <Text style={styles.footerLoaderText}>Carregando mais...</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.screen,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    paddingHorizontal: 16,
    backgroundColor: colors.brand.primary,
    borderBottomWidth: 2.5,
    borderBottomColor: colors.brand.dark,
    gap: 10,
  },

  backButton: {
    justifyContent: "center",
    alignItems: "center",
  },

  backIcon: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text.accent,
  },

  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.text.accent,
  },

  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    color: colors.text.accent,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text.accent,
  },

  statLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "600",
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.default,
  },

  // ── Section ──
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  sectionCount: {
    fontWeight: "600",
    color: colors.text.placeholder,
  },

  // ── Mapa ──
  mapContainer: {
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 10,
  },

  mapPlaceholder: {
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.default,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg.section,
    marginBottom: 10,
  },

  mapPlaceholderText: {
    fontSize: 13,
    color: colors.text.placeholder,
  },

  // ── Lote info card ──
  loteInfoCard: {
    flexDirection: "row",
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 6,
  },

  loteColorBar: {
    width: 5,
    alignSelf: "stretch",
  },

  loteInfoContent: {
    flex: 1,
    padding: 12,
  },

  loteNome: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.title,
    marginBottom: 6,
  },


  loteChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  chip: {
    backgroundColor: colors.bg.section,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  chipText: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: "600",
  },

  // ── Lista ──
  listContent: {
    paddingBottom: 32,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 16,
    color: colors.text.secondary,
    fontSize: 14,
  },

  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },

  footerLoaderText: {
    fontSize: 13,
    color: colors.text.muted,
  },
});
