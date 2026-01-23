import { apiFetch } from "../lib/apiClient";

export interface Grupo {
  id_grupo: string;
  nome_grupo: string;
  color: string;
}

export const grupoService = {
  async getAllByPropriedade(idPropriedade: number): Promise<Grupo[]> {
    try {
      const response = await apiFetch(`/grupos/propriedade/${idPropriedade}?page=1&limit=50`);
      return response.data.map((item: any) => ({
        id_grupo: item.id_grupo,
        nome_grupo: item.nome_grupo,
        color: item.color || "#000000"
      }));
    } catch (err) {
      console.error("Erro ao buscar grupos:", err);
      return [];
    }
  }
};
