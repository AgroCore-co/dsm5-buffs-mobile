import { apiFetch } from "../lib/apiClient";

// Service para propriedades
export const getPropriedades = async (token?: string) => {
  try {
    const result = await apiFetch("/propriedades");
    const propriedades = result?.propriedades?.map((p: any) => ({
      id: p.id_propriedade,
      nome: p.nome,
    })) || [];

    return { propriedades };
  } catch (error: any) {
    if (error.status === 401 || error.message.includes("Nenhuma Propriedade")) {
      return { propriedades: [] };
    }
    throw error;
  }
};

// Service para dashboard da propriedade
export const getDashboardPropriedade = async (idPropriedade: string | number, token?: string) => {
  try {
    const result = await apiFetch(`/dashboard/${idPropriedade}`);
    const dashboard = {
      machos: result.qtd_macho_ativos,
      femeas: result.qtd_femeas_ativas,
      bufalosAtivos: result.qtd_macho_ativos+result.qtd_femeas_ativas,
      bezerros: result.qtd_bufalos_bezerro,
      novilhas: result.qtd_bufalos_novilha,
      vacas: result.qtd_bufalos_vaca,
      touros: result.qtd_bufalos_touro,
      bufalasLactando: result.qtd_bufalas_lactando,
      qtdLotes: result.qtd_lotes,
      qtdUsuarios: result.qtd_usuarios,
      bufalosPorRaca: result.bufalosPorRaca || [],
    };

    return { dashboard };
  } catch (error: any) {
    if (error.status === 404) {
      return { dashboard: null };
    }
    throw error;
  }
};

export default {
  getPropriedades,
  getDashboardPropriedade,
};
