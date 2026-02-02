import { apiFetch } from "../lib/apiClient";

export interface Grupo {
  id_grupo: string;
  nome_grupo: string;
  color: string;
}

export const grupoService = {
  async getAllByPropriedade(idPropriedade: string): Promise<Grupo[]> {
    try {
      const response = await apiFetch(`/grupos/propriedade/${idPropriedade}?page=1&limit=50`);
      return response.data.map((item: any) => ({
        id_grupo: item.idGrupo,
        nome_grupo: item.nomeGrupo,
        color: item.color || "#000000"
      }));
    } catch (err) {
      console.error("Erro ao buscar grupos:", err);
      return [];
    }
  }
};
