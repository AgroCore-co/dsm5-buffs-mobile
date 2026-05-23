import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../lib/apiClient";
import { getStats } from './dashboardService';

const PROPS_CACHE_KEY = "cachedPropriedades";

// Service para propriedades
export const getPropriedades = async () => {
  try {
    const result = await apiFetch("/propriedades");
    const propriedades = result?.propriedades?.map((p: any) => ({
      id: p.idPropriedade,
      nome: p.nome,
    })) || [];

    if (propriedades.length > 0) {
      AsyncStorage.setItem(PROPS_CACHE_KEY, JSON.stringify(propriedades)).catch(() => {});
    }

    return { propriedades };
  } catch (error: any) {
    if (error.status === 401 || error.message?.includes("Nenhuma Propriedade")) {
      return { propriedades: [] };
    }
    // Offline or server unreachable — use cache
    try {
      const cached = await AsyncStorage.getItem(PROPS_CACHE_KEY);
      if (cached) return { propriedades: JSON.parse(cached) };
    } catch {}
    return { propriedades: [] };
  }
};

// Service para dashboard da propriedade
export const getDashboardPropriedade = async (idPropriedade: string | number) => {
  const result = await getStats(String(idPropriedade));
  const dashboard = {
    machos: result.qtd_macho_ativos,
    femeas: result.qtd_femeas_ativas,
    bufalosAtivos: result.qtd_macho_ativos + result.qtd_femeas_ativas,
    bezerros: result.qtd_bufalos_bezerro,
    novilhas: result.qtd_bufalos_novilha,
    vacas: result.qtd_bufalos_vaca,
    touros: result.qtd_bufalos_touro,
    bufalasLactando: result.qtd_bufalas_lactando,
    qtdLotes: result.qtd_lotes,
    qtdUsuarios: result.qtd_usuarios,
    bufalosPorRaca: result.bufalosPorRaca,
  };
  return { dashboard };
};

export default {
  getPropriedades,
  getDashboardPropriedade,
};
