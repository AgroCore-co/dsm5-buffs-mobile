import React, { useEffect, useState } from "react";
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
import { Modal } from "../Modal";

import {
  getAlertasPorPropriedade,
  Alerta as AlertaApi,
  Filtro,
  marcarAlertaVisto,
} from "../../services/alertaService";

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { NavigatorScreenParams } from "@react-navigation/native";

type MainTabParamList = {
  Home: undefined;
  Rebanho: undefined;
  Lactação: undefined;
  Reprodução: undefined;
  Piquetes: undefined;
};

type RootStackParamList = {
  MainTab: NavigatorScreenParams<MainTabParamList>;
  AnimalDetail: { id: string };
};

type Alerta = AlertaApi;

export default function AlertasPendentes({
  idPropriedade,
}: {
  idPropriedade: string;
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [filtro, setFiltro] = useState<Filtro>("PENDENTES");
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [alertaSelecionado, setAlertaSelecionado] =
    useState<Alerta | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const formatarData = (data: string) => {
    if (!data) return "";

    const [dataParte] = data.split(" "); // "2025-11-22"
    const [ano, mes, dia] = dataParte.split("-");

    return `${dia}/${mes}/${ano}`;
  };

  const carregarAlertas = async (page = 1, reset = false) => {
    if (loading) return;

    try {
      setLoading(true);

      const res = await getAlertasPorPropriedade(
        idPropriedade,
        filtro,
        page,
        10
      );

      setTotalPaginas(res.meta.totalPages);
      setPagina(res.meta.page);

      setAlertas((prev) => {
        const mapa = new Map<string, Alerta>();

        [...(reset ? [] : prev), ...res.alertas].forEach((a) => {
          mapa.set(a.idAlerta, a);
        });

        return Array.from(mapa.values());
      });
    } catch (err) {
      console.error("Erro ao buscar alertas:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ⬇️ dispara busca quando propriedade ou filtro mudam
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
    if (pagina < totalPaginas && !loading) {
      carregarAlertas(pagina + 1);
    }
  };

  const confirmarVisto = async () => {
    if (!alertaSelecionado) return;

    try {
      await marcarAlertaVisto(alertaSelecionado.idAlerta);
      setAlertas((prev) =>
        prev.map((a) =>
          a.idAlerta === alertaSelecionado.idAlerta
            ? { ...a, visto: true }
            : a
        )
      );
    } finally {
      setModalVisible(false);
      setAlertaSelecionado(null);
    }
  };

  const renderItem = ({ item }: { item: Alerta }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        if (
          (item.nicho === "SANITARIO" || item.nicho === "CLINICO") &&
          item.animalId
        ) {
          navigation.navigate("AnimalDetail", { id: item.animalId });
        }

        if (item.nicho === "REPRODUCAO") {
          navigation.navigate("MainTab", { screen: "Reprodução" });
        }

        if (item.nicho === "MANEJO") {
          navigation.navigate("MainTab", { screen: "Piquetes" });
        }
      }}
    >
      <View style={styles.cardContent}>
        <Text style={styles.title}>{item.motivo}</Text>
        <Text style={styles.desc}>{item.observacao}</Text>

        <View style={styles.footer}>
          <Text style={styles.tag}>{item.nicho}</Text>

          <View style={styles.date}>
            <CalendarIcon size={14} fill={colors.brown.base} />
            <Text>{formatarData(item.dataAlerta)}</Text>
          </View>
        </View>

        {!item.visto && (
          <TouchableOpacity
            style={styles.resolve}
            onPress={() => {
              setAlertaSelecionado(item);
              setModalVisible(true);
            }}
          >
            <Text style={styles.resolveText}>Marcar como visto</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <Modal visible={modalVisible} onClose={() => setModalVisible(false)}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Resolver alerta?</Text>
          <Text style={styles.modalDesc}>
            {alertaSelecionado?.motivo}
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={confirmarVisto}>
              <Text style={{ fontWeight: "700" }}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.tabs}>
        <Tabs
          tabs={[
            { key: "TODOS", label: "Todas" },
            { key: "PENDENTES", label: "Não vistas" },
          ]}
          activeTab={filtro}
          onChange={(k) => setFiltro(k as Filtro)}
        />
      </View>

      <FlatList
        data={alertas}
        keyExtractor={(item) => item.idAlerta}
        renderItem={renderItem}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color={colors.yellow.base}
              style={{ marginVertical: 20 }}
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
    backgroundColor: colors.white.base,
    borderRadius: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: colors.gray.disabled,
    overflow: "hidden",
  },
  priority: { width: 6 },
  cardContent: { flex: 1, padding: 14 },
  title: { fontSize: 15, fontWeight: "700" },
  desc: { fontSize: 13, color: colors.gray.base },
  footer: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tag: {
    backgroundColor: colors.yellow.base,
    paddingHorizontal: 10,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: "600",
  },
  date: { flexDirection: "row", alignItems: "center", gap: 4 },
  resolve: {
    marginTop: 14,
    backgroundColor: "#22c55e",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  resolveText: { color: "white", fontWeight: "600" },
  modal: { backgroundColor: "white", padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  modalDesc: { textAlign: "center", color: colors.gray.base },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  tabs: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray.disabled,
  },
});
