import { apiFetch } from "../lib/apiClient";

export interface NovaMovimentacaoDTO {
  idPropriedade: string;
  idGrupo: string;
  idLoteAtual: string;
  idLoteAnterior?: string;
  dtEntrada: string;
}

export interface StatusGrupo {
  grupo_id: string;
  localizacao_atual: {
    id_lote: string;
    desde: string;
    dias_no_local: number;
  };
}

export interface HistoricoMovimento {
  id_movimento: string;
  id_lote_anterior: string | null;
  id_lote_atual: string;
  dt_entrada: string;
  dt_saida: string | null;
  dias_permanencia: number;
  status: "Finalizado" | "Atual";
}

export interface HistoricoGrupo {
  grupo_id: string;
  total_movimentacoes: number;
  historico: HistoricoMovimento[];
}

export const movLoteService = {
  async create(data: NovaMovimentacaoDTO): Promise<void> {
    await apiFetch("/mov-lote", {
      method: "POST",
      body: data,
    });
  },

  async findByPropriedade(
    idPropriedade: string,
    page = 1,
    limit = 20
  ): Promise<{ data: any[]; meta: any }> {
    return apiFetch(
      `/mov-lote/propriedade/${idPropriedade}?page=${page}&limit=${limit}`
    );
  },

  async findStatusAtual(idGrupo: string): Promise<StatusGrupo> {
    return apiFetch(`/mov-lote/status/grupo/${idGrupo}`);
  },

  async findHistoricoGrupo(idGrupo: string): Promise<HistoricoGrupo> {
    return apiFetch(`/mov-lote/historico/grupo/${idGrupo}`);
  },
};
