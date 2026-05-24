import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import { colors } from "../../styles/colors";

import CalendarIcon from "../../icons/calendar";

import { Tabs } from "../Tabs";

import {
  getAlertasPorPropriedade,
  Alerta as AlertaApi,
  Filtro,
  marcarAlertaVisto,
} from "../../services/alertaService";

import {
  useNavigation,
} from "@react-navigation/native";

import {
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import {
  NavigatorScreenParams,
} from "@react-navigation/native";

import {
  ConfirmModal,
} from "../ModalStatus";

type MainTabParamList = {
  Home: undefined;
  Rebanho: undefined;
  Lactação: undefined;
  Reprodução: undefined;
  Piquetes: undefined;
};

type RootStackParamList = {
  MainTab:
    NavigatorScreenParams<MainTabParamList>;

  AnimalDetail: {
    id: string;
  };
};

type Alerta = AlertaApi;

export default function AlertasPendentes({
  idPropriedade,
}: {
  idPropriedade: string;
}) {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList>
    >();

  const [filtro, setFiltro] =
    useState<Filtro>("PENDENTES");

  const [alertas, setAlertas] =
    useState<Alerta[]>([]);

  const [pagina, setPagina] =
    useState(1);

  const [
    totalPaginas,
    setTotalPaginas,
  ] = useState(1);

  const [loading, setLoading] =
    useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    alertaSelecionado,
    setAlertaSelecionado,
  ] = useState<Alerta | null>(null);

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const formatarData = (
    data: string
  ) => {
    if (!data) return "";

    const [dataParte] =
      data.split(" ");

    const [
      ano,
      mes,
      dia,
    ] = dataParte.split("-");

    return `${dia}/${mes}/${ano}`;
  };

  const carregarAlertas = async (
    page = 1,
    reset = false
  ) => {
    if (loading) return;

    try {
      setLoading(true);

      const res =
        await getAlertasPorPropriedade(
          idPropriedade,
          filtro,
          page,
          10
        );

      setTotalPaginas(
        res.meta.totalPages
      );

      setPagina(res.meta.page);

      setAlertas((prev) => {
        const mapa = new Map<
          string,
          Alerta
        >();

        [
          ...(reset ? [] : prev),
          ...res.alertas,
        ].forEach((a) => {
          mapa.set(a.idAlerta, a);
        });

        return Array.from(
          mapa.values()
        );
      });
    } catch (err) {
      console.error(
        "Erro ao buscar alertas:",
        err
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setAlertas([]);
    setPagina(1);

    carregarAlertas(1, true);
  }, [filtro, idPropriedade]);

  const onRefresh = () => {
    setRefreshing(true);

    setPagina(1);

    carregarAlertas(1, true);
  };

  const onEndReached = () => {
    if (
      pagina < totalPaginas &&
      !loading
    ) {
      carregarAlertas(pagina + 1);
    }
  };

  const confirmarVisto =
    async () => {
      if (!alertaSelecionado)
        return;

      try {
        await marcarAlertaVisto(
          alertaSelecionado.idAlerta
        );

        setAlertas((prev) =>
          prev.map((a) =>
            a.idAlerta ===
            alertaSelecionado.idAlerta
              ? {
                  ...a,
                  visto: true,
                }
              : a
          )
        );
      } finally {
        setModalVisible(false);

        setAlertaSelecionado(null);
      }
    };

  const renderItem = ({
    item,
  }: {
    item: Alerta;
  }) => {
    const nichoColors: Record<
      string,
      {
        bg: string;
        soft: string;
      }
    > = {
      SANITARIO: {
        bg: colors.status.error,
        soft:
          colors.status.errorBg,
      },

      CLINICO: {
        bg: colors.status.error,
        soft:
          colors.status.errorBg,
      },

      REPRODUCAO: {
        bg: colors.status.warning,
        soft:
          colors.status.warningBg,
      },

      MANEJO: {
        bg: colors.status.success,
        soft:
          colors.status.successBg,
      },
    };

    const color =
      nichoColors[item.nicho] || {
        bg: colors.brand.primary,
        soft:
          colors.brand.primaryLight,
      };

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => {
          if (
            (item.nicho ===
              "SANITARIO" ||
              item.nicho ===
                "CLINICO") &&
            item.animalId
          ) {
            navigation.navigate(
              "AnimalDetail",
              {
                id: item.animalId,
              }
            );
          }

          if (
            item.nicho ===
            "REPRODUCAO"
          ) {
            navigation.navigate(
              "MainTab",
              {
                screen:
                  "Reprodução",
              }
            );
          }

          if (
            item.nicho ===
            "MANEJO"
          ) {
            navigation.navigate(
              "MainTab",
              {
                screen:
                  "Piquetes",
              }
            );
          }
        }}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.iconWrapper]}>
            <CalendarIcon size={24} fill={colors.text.accent} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            {item.motivo}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.desc}>
              {item.observacao}
            </Text>

            <View style={styles.dateInline}>
              <View style={[ styles.tag, { backgroundColor: color.soft } ]}>
                <Text style={[ styles.tagText]}>
                  {item.nicho}
                </Text>
              </View>
              <View style={styles.dateInfo}>
                <CalendarIcon size={12} fill={colors.text.secondary} />
                <Text style={styles.dateInlineText}>
                  {formatarData(item.dataAlerta)}
                </Text>
              </View>
              {item.visto && (
                <View style={styles.vistoBadge}>
                  <Text style={styles.vistoText}>✓ Visto</Text>
                </View>
              )}
            </View>
            
          </View>

          {!item.visto && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.resolve}
                onPress={() => {
                  setAlertaSelecionado(item);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.resolveText}>
                  Marcar visto
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ConfirmModal
        visible={modalVisible}
        title="Resolver alerta?"
        message={
          alertaSelecionado?.motivo ||
          ""
        }
        onConfirm={confirmarVisto}
        onCancel={() =>
          setModalVisible(false)
        }
        confirmText="Confirmar"
        cancelText="Cancelar"
        variant="success"
      />

      <View style={styles.tabs}>
        <Tabs
          tabs={[
            {
              key: "TODOS",
              label: "Todas",
            },

            {
              key: "PENDENTES",
              label: "Não vistas",
            },
          ]}
          activeTab={filtro}
          onChange={(k) =>
            setFiltro(k as Filtro)
          }
        />
      </View>

      <FlatList
        data={alertas}
        keyExtractor={(item) =>
          item.idAlerta
        }
        renderItem={renderItem}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{
          paddingTop: 14,
          paddingBottom: 30,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color={
                colors.brand.primary
              }
              style={{
                marginVertical: 20,
              }}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor:
      colors.bg.card,

    borderRadius: 18,

    marginBottom: 14,

    borderWidth: 1,

    borderColor:
      colors.border.default,

    paddingVertical: 16,
    paddingRight: 16,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.06,

    shadowRadius: 8,

    elevation: 3,
  },

  iconContainer: {
    width: 58,
    justifyContent: "center",
    alignItems: "center",
  },

  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    color: colors.text.accent,
  },

  desc: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.secondary,
  },

  footer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    flexDirection: "row",
    justifyContent:"space-between",
    alignItems: "center",
  },

  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  tag: {
    alignSelf: "flex-start",

    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 999,
  },

  tagText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text.accent,
  },

  date: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  dateText: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  resolve: {
    width: "90%",
    height: 36,
    marginLeft: 10,
    backgroundColor:
      colors.brand.primary,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  resolveText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: colors.text.accent,
  },

  vistoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.status.successBg,
  },

  vistoText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.status.successText,
  },

  tabs: {
    paddingBottom: 8,

    borderBottomWidth: 1,

    borderBottomColor:
      colors.border.default,
  },
  metaRow: {
    marginTop: 6,
    gap: 6,
  },

  dateInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
  },

  dateInlineText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});