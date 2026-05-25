import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
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
import {
  hasCachedTiles,
  getTilesMeta,
  getTileDataUri,
  downloadTilesForProp,
  estimateTileCount,
} from "../services/tileDownloadService";
import { usePropriedade } from "../context/PropriedadeContext";
import { RootStackParamList } from "../../App";
import ArrowLeftIcon from "../icons/arrowLeft";
import Mov from "../icons/mov";
import Plus from '../../assets/images/plus.svg';

import { FloatingAction } from "react-native-floating-action";
import RotateLeftIcon from "../icons/arrow";
import { MovimentacaoSheet } from "../components/MovimentacaoSheet";

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
  isOnline: boolean;
  hasTiles: boolean;
  tilesDownloadDate: string | null;
  isDownloadingTiles: boolean;
  tileProgress: number;
  tileCountEst: number | null;
  onDownloadTiles: () => void;
  getTile?: (z: number, x: number, y: number) => Promise<string | null>;
}

const LoteMapSection = ({
  lotes,
  grupoId,
  grupoColor,
  isOnline,
  hasTiles,
  tilesDownloadDate,
  isDownloadingTiles,
  tileProgress,
  tileCountEst,
  onDownloadTiles,
  getTile,
}: LoteMapSectionProps) => {
  const lotesDoGrupo = useMemo(
    () => lotes.filter((l) => l.idGrupo === grupoId),
    [lotes, grupoId],
  );
  const loteAtual = lotesDoGrupo[0] ?? null;
  const algumTemGeometria = useMemo(
    () => lotesDoGrupo.some((l) => l.coords && l.coords.length > 0),
    [lotesDoGrupo],
  );

  // Array estável: só recria quando os lotes ou a cor do grupo mudam,
  // evitando que htmlContent do Mapa recalcule (e o WebView recarregue) a cada render.
  const lotesMapeados = useMemo(
    () => lotesDoGrupo.map((l, i) => ({
      ...l,
      color:       i === 0 ? grupoColor : "#AAAAAA",
      fillOpacity: i === 0 ? 0.12 : 0.06,
      weight:      i === 0 ? 3    : 1.5,
    })),
    [lotesDoGrupo, grupoColor],
  );

  // Mostra mapa se: (online) OU (offline + tiles salvos no SQLite)
  const canShowMap = algumTemGeometria && (isOnline || hasTiles);

  // Estimativa em MB: ~25 KB por tile, base64 overhead já considerado
  const estMB = tileCountEst ? Math.round((tileCountEst * 25) / 1024) : null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PIQUETE DO GRUPO</Text>

      {canShowMap ? (
        <View style={styles.mapContainer}>
          <MapLeaflet
            piquetes={lotesMapeados}
            currentLocation={null}
            isOffline={!isOnline}
            getTile={!isOnline && hasTiles ? getTile : undefined}
          />
        </View>
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>
            {!isOnline
              ? "Mapa indisponível offline\nBaixe o mapa enquanto tiver conexão"
              : lotesDoGrupo.length > 0
              ? "Piquete sem geometria definida"
              : "Grupo sem piquete associado"}
          </Text>
        </View>
      )}

      {/* Barra de salvar/status do mapa offline — só aparece se há geometria */}
      {algumTemGeometria && isOnline && (
        isDownloadingTiles ? (
          <View style={styles.tileBar}>
            <View style={styles.tileTrack}>
              <View style={[styles.tileFill, { width: `${Math.round(tileProgress * 100)}%` as any }]} />
            </View>
            <Text style={styles.tileBarLabel}>
              Salvando mapa offline… {Math.round(tileProgress * 100)}%
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.tileBar} onPress={onDownloadTiles} activeOpacity={0.7}>
            <Text style={styles.tileBarLabel}>
              {tilesDownloadDate
                ? `🗺 Mapa salvo — Atualizar${estMB ? ` (~${estMB} MB)` : ''}`
                : `⬇ Salvar mapa offline${estMB ? ` (~${estMB} MB)` : ''}`}
            </Text>
          </TouchableOpacity>
        )
      )}

      {loteAtual ? (
        <View style={styles.loteInfoCard}>
          <View style={[styles.loteColorBar, { backgroundColor: grupoColor }]} />
          <View style={styles.loteInfoContent}>
            {/* Nome + badge Em uso */}
            <View style={styles.loteHeader}>
              <Text style={styles.loteNome}>{loteAtual.nome}</Text>
              <View style={[styles.chip, { backgroundColor: colors.status.successBg }]}>
                <Text style={[styles.chipText, { color: colors.status.successText }]}>Em uso</Text>
              </View>
            </View>

            {/* Descrição, se houver */}
            {loteAtual.descricao ? (
              <Text style={styles.loteDescricao}>{loteAtual.descricao}</Text>
            ) : null}

            {/* Chips: tipo, área, capacidade */}
            <View style={styles.loteChips}>
              {loteAtual.tipoLote ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{loteAtual.tipoLote}</Text>
                </View>
              ) : null}
              {Number(loteAtual.areaM2) > 0 && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>
                    {Number(loteAtual.areaM2).toLocaleString('pt-BR')} m²
                  </Text>
                </View>
              )}
              {Number(loteAtual.qtdMax) > 0 && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Cap. {loteAtual.qtdMax} animais</Text>
                </View>
              )}
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
  const [showMovSheet, setShowMovSheet] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // ── tiles offline ──
  const [hasTiles, setHasTiles]                     = useState(false);
  const [tilesDownloadDate, setTilesDownloadDate]   = useState<string | null>(null);
  const [isDownloadingTiles, setIsDownloadingTiles] = useState(false);
  const [tileProgress, setTileProgress]             = useState(0);
  const [tileCountEst, setTileCountEst]             = useState<number | null>(null);
  const tileAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  // Carrega estado dos tiles ao montar + cancela download ao desmontar
  useEffect(() => {
    if (!propriedadeSelecionada) return;
    const id = propriedadeSelecionada.toString();

    hasCachedTiles(id).then((has) => {
      setHasTiles(has);
      if (has) {
        getTilesMeta(id).then((m) => setTilesDownloadDate(m?.downloadedAt ?? null));
      }
    });

    estimateTileCount(id).then((n) => setTileCountEst(n));

    return () => {
      tileAbortRef.current?.abort();
    };
  }, [propriedadeSelecionada]);

  const getTile = useCallback(
    async (z: number, x: number, y: number): Promise<string | null> => {
      if (!propriedadeSelecionada) return null;
      return getTileDataUri(propriedadeSelecionada.toString(), z, x, y);
    },
    [propriedadeSelecionada],
  );

  const handleDownloadTiles = useCallback(async () => {
    if (!propriedadeSelecionada || isDownloadingTiles) return;
    const id = propriedadeSelecionada.toString();
    const ctrl = new AbortController();
    tileAbortRef.current = ctrl;

    setIsDownloadingTiles(true);
    setTileProgress(0);

    try {
      await downloadTilesForProp(
        id,
        ({ downloaded, total }) => setTileProgress(downloaded / total),
        ctrl.signal,
      );
      setHasTiles(true);
      setTilesDownloadDate(new Date().toISOString());
    } catch {
      // abortado ou erro de rede — não mostra mensagem de erro, apenas encerra
    } finally {
      setIsDownloadingTiles(false);
      setTileProgress(0);
    }
  }, [propriedadeSelecionada, isDownloadingTiles]);

  const LIMIT = 20;

  const fetchData = useCallback(async (reset = false, pageOverride?: number) => {
    if (!propriedadeSelecionada) return;
    const currentPage = reset ? 1 : (pageOverride ?? page);
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
    const nextPage = page + 1;
    setLoadingMore(true);
    setPage(nextPage);
    fetchData(false, nextPage);
  };

  // Lote ativo = primeiro do grupo (updatedAt DESC do getAll)
  const loteAtivo = lotes.find((l) => l.idGrupo === grupoId) ?? null;
  const qtdMax = Number(loteAtivo?.qtdMax ?? 0);
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
        isOnline={isOnline}
        hasTiles={hasTiles}
        tilesDownloadDate={tilesDownloadDate}
        isDownloadingTiles={isDownloadingTiles}
        tileProgress={tileProgress}
        tileCountEst={tileCountEst}
        onDownloadTiles={handleDownloadTiles}
        getTile={getTile}
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
        <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', alignContent: 'center', marginTop: 10, gap: 12 }}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <ArrowLeftIcon width={24} height={24} />
          </TouchableOpacity>
          <Text style={[styles.header1Text, { flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
            GRUPO: {nomeGrupo || 'N/A'}
          </Text>
        </View>
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
            categoria={maturidadeMap[item.categoria] ?? item.categoria}
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

      {/* FAB — Mover Grupo */}
      <FloatingAction
        actions={[
          {
            text: "Mover Grupo",
            icon: <Mov width={20} height={20}/>,
            name: "mover_grupo",
            color: colors.brand.primary,
          },
        ]}
        onPressItem={() => setShowMovSheet(true)}
        buttonSize={60}
        color={colors.brand.primary}
        floatingIcon={<Plus width={24} height={24} fill="black" />}
        position="right"
      />

      {/* BottomSheet de Movimentação */}
      {showMovSheet && propriedadeSelecionada && (
        <MovimentacaoSheet
          grupo={{ id: grupoId, nome: nomeGrupo, color }}
          propriedadeId={propriedadeSelecionada.toString()}
          loteAtualId={loteAtivo?.id}
          grupoId={grupoId}
          onClose={() => setShowMovSheet(false)}
          onSuccess={() => {
            setShowMovSheet(false);
            onRefresh();
          }}
        />
      )}
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

  headerButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  headerArrow: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.text.accent,
  },

  header1Text: {
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
    color: colors.text.accent,
    marginBottom: 5
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

  loteInfoCardDisabled: {
    opacity: 0.5,
  },

  loteColorBar: {
    width: 5,
    alignSelf: "stretch",
  },

  loteInfoContent: {
    flex: 1,
    padding: 12,
  },

  loteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },

  loteNome: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.title,
    flex: 1,
  },

  loteNomeMuted: {
    color: colors.text.muted,
  },

  loteDescricao: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 8,
    lineHeight: 17,
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

  // ── Tile bar (salvar mapa offline) ──
  tileBar: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bg.section,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 10,
    gap: 6,
  },

  tileBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
  },

  tileTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },

  tileFill: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
  },

  // ── Lista ──
  listContent: {
    paddingBottom: 32,
    marginHorizontal: 10,
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
