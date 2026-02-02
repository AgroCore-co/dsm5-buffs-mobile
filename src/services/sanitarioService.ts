import { apiFetch } from "../lib/apiClient";

export interface Medicacao {
  id_medicacao: string;
  medicacao: string;
  descricao: string;
  tipo_tratamento: string; 
}

export const sanitarioService = {
  add: async (payload: any) => {
    try {
      console.log("Payload enviado para API:", payload);

      // Apenas envia, não tenta converter retorno em JSON
      await apiFetch(`/dados-sanitarios`, { 
        method: 'POST', 
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });

      // Retorno opcional
      return true;

    } catch (err) {
      console.error("Erro ao adicionar histórico sanitário:", err);
      throw err;
    }
  },
  getHistorico: async (
    id_bufalo: string,
    page: number = 1,
    limit: number = 10
  ) => {
    try {
      const result = await apiFetch(
        `/dados-sanitarios/bufalo/${id_bufalo}?page=${page}&limit=${limit}`
      );

      const dadosTratados = result.data.map((registro: any) => ({
        ...registro,

        // nomes normalizados para o front
        nome_medicamento: registro.medicacoe?.medicacao ?? "Medicamento Desconhecido",
        tipo_tratamento: registro.medicacoe?.tipoTratamento ?? "-",
      }));

      return {
        ...result,
        data: dadosTratados,
      };
    } catch (err) {
      console.error("Erro ao buscar histórico sanitário:", err);
      throw err;
    }
  },
  getMedicamentos: async () => {
    try {
      return await apiFetch(`/medicamentos`);
    } catch (err) {
      console.error("Erro ao buscar medicamentos:", err);
      throw err;
    }
  },
  async getMedicamentosByPropriedade(idPropriedade: string): Promise<Medicacao[]> {
    try {
      const response = await apiFetch(`/medicamentos/propriedade/${idPropriedade}`);
      const medicamentosData = response;
      
      if (!Array.isArray(medicamentosData)) {
          console.error("Resposta da API inesperada. Não é um array.");
          return [];
      }

      return medicamentosData.map((item: any) => ({
        id_medicacao: item.idMedicacao,
        medicacao: item.medicacao,
        tipo_tratamento: item.tipoTratamento,
        descricao: item.descricao 
      }));
    } catch (err) {
      console.error("Erro ao buscar medicamentos por propriedade:", err);
      return []; 
    }
  },
  delete: async (id_sanit: string) => {
    try {
      return await apiFetch(`/dados-sanitarios/${id_sanit}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Erro ao excluir histórico sanitario:", err);
      throw err;
    }
  },
  update: async (id_sanit: string, payload: any) => {
    try {
      return await apiFetch(`/dados-sanitarios/${id_sanit}`, {
        method: "PATCH",
        body: payload
      });
    } catch (err) {
      console.error("Erro ao atualizar histórico sanitario:", err);
      throw err;
    }
  },
};

export default sanitarioService;