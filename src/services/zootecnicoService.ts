import { apiFetch } from "../lib/apiClient";
import { zootecToApiAdapter } from "./adapters/bufaloAdapter";

export const zootecService = {
  getHistorico: async (
    id_bufalo: string,
    page: number = 1,
    limit: number = 10
  ) => {
    try {
      return await apiFetch(
        `/dados-zootecnicos/bufalo/${id_bufalo}?page=${page}&limit=${limit}`
      );
    } catch (err) {
      console.error("Erro ao buscar histórico zootécnico:", err);
      throw err;
    }
  },

  add: async (id_bufalo: string, payload: any) => {
    try {
      return await apiFetch(
        `/dados-zootecnicos/bufalo/${id_bufalo}`,
        {
          method: "POST",
          body: zootecToApiAdapter(payload), 
        }
      );
    } catch (err) {
      console.error("Erro ao adicionar histórico zootécnico:", err);
      throw err;
    }
  },

  update: async (id_zootec: string, payload: any) => {
    try {
      return await apiFetch(
        `/dados-zootecnicos/${id_zootec}`,
        {
          method: "PATCH",
          body: zootecToApiAdapter(payload), // ✅
        }
      );
    } catch (err) {
      console.error("Erro ao atualizar histórico zootécnico:", err);
      throw err;
    }
  },

  delete: async (id_zootec: number) => {
    try {
      return await apiFetch(`/dados-zootecnicos/${id_zootec}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Erro ao excluir histórico zootécnico:", err);
      throw err;
    }
  },
};

export default zootecService;
