import { apiFetch } from "../lib/apiClient";
import { formatarDataBR } from "../utils/date";

/* =========================
   INTERFACES
========================= */

export interface CicloLactacao {
  id_bufalo: string;
  nome: string;
  brinco: string;
  idade_meses: number;
  raca: string;
  ciclo_atual: {
    id_ciclo_lactacao: string;
    numero_ciclo: number;
    dt_parto: string;
    dias_em_lactacao: number;
    dt_secagem_prevista: string;
    status: string;
  };
  producao_atual: {
    total_produzido: number;
    media_diaria: number;
    ultima_ordenha: {
      data: string;
      quantidade: number;
      periodo: "M" | "T" | "N" | string;
    } | null;
  };
}

export interface EstoqueLeite {
  id_estoque: string;
  id_propriedade: string;
  id_usuario: string;
  quantidade: number;
  dt_registro: string;
  observacao: string;
  created_at: string;
  updated_at: string;
}

export interface Industria {
  id_industria: string;
  nome: string;
  endereco: string;
  contato?: string;
}

export interface LactacaoRegistroPayload {
  id_bufala: string;
  id_propriedade: number;
  id_ciclo_lactacao: string;
  qt_ordenha: number;
  periodo: string;
  ocorrencia?: string;
  dt_ordenha: string;
}

export interface ColetaRegistroPayload {
  id_industria: string;
  id_propriedade: string;
  resultado_teste: boolean;
  observacao?: string;
  quantidade: number;
  dt_coleta: string;
}

export interface EstoqueRegistroPayload {
  id_propriedade: string | number;
  id_usuario: string;
  quantidade: number;
  dt_registro: string;
  observacao?: string;
}

/* =========================
   GET — CICLOS DE LACTAÇÃO
========================= */

export const getCiclosLactacao = async (
  propriedadeId: string,
  page = 1,
  limit = 10
) => {
  try {
    if (!propriedadeId) {
      throw new Error("ID da propriedade é obrigatório.");
    }

    const response: {
      data: any[];
      meta: {
        page: number;
        totalPages: number;
        totalItems: number;
      };
    } = await apiFetch(
      `/lactacao/propriedade/${propriedadeId}?page=${page}&limit=${limit}`
    );

    const ciclos = response?.data ?? [];

    const ciclosFormatados = ciclos.map((c) => ({
      idCicloLactacao: c.idCicloLactacao,
      idBufala: c.idBufala,
      nome: c.bufalo?.nome ?? "Não informado",
      brinco: c.bufalo?.brinco ?? "-",
      status: c.status,
      dtSecagemPrevista: c.dtSecagemPrevista
        ? formatarDataBR(c.dtSecagemPrevista)
        : "—",
    }));

    return {
      ciclos: ciclosFormatados,
      meta: response.meta,
    };
  } catch (error) {
    console.error("Erro ao buscar ciclos de lactação:", error);
    return {
      ciclos: [],
      meta: { page: 1, totalPages: 1, totalItems: 0 },
    };
  }
};

/* =========================
   GET — ESTATÍSTICAS
========================= */

export const getEstatisticasLactacao = async (propriedadeId: string) => {
  try {
    if (!propriedadeId) {
      throw new Error("ID da propriedade é obrigatório.");
    }

    return await apiFetch(
      `/lactacao/propriedade/${propriedadeId}/estatistica`
    );
  } catch (error) {
    console.error("Erro ao buscar estatísticas de lactação:", error);
    return {
      total_ciclos: 0,
      ciclos_ativos: 0,
      ciclos_secos: 0,
      media_dias_lactacao: 0,
      ciclos_proximos_secagem: 0,
      ciclos_secagem_atrasada: 0,
    };
  }
};

/* =========================
   GET — INDÚSTRIAS
========================= */

export const getIndustriasPorPropriedade = async (propriedadeId: string) => {
  try {
    if (!propriedadeId) throw new Error("ID da propriedade é obrigatório.");

    const response: Industria[] = await apiFetch(
      `/laticinios/propriedade/${propriedadeId}`
    );

    return response || [];
  } catch (error) {
    console.error("Erro ao buscar indústrias da propriedade:", error);
    return [];
  }
};

/* =========================
   POST / PATCH (INALTERADOS)
========================= */

export const registrarLactacaoApi = async (payload: LactacaoRegistroPayload) => {
  try {
    return await apiFetch("/lactacao", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Erro ao registrar lactação na API:", error);
    throw new Error("Falha ao registrar lactação.");
  }
};

export const registrarColetaApi = async (payload: ColetaRegistroPayload) => {
  try {
    return await apiFetch("/coletas", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Erro ao registrar coleta na API:", error);
    throw new Error("Falha ao registrar coleta.");
  }
};

export const registrarEstoqueApi = async (payload: EstoqueRegistroPayload) => {
  try {
    return await apiFetch("/estoque-leite", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Erro ao registrar estoque na API:", error);
    throw new Error("Falha ao registrar estoque.");
  }
};

export const encerrarLactacao = async (idCiclo: string | number) => {
  try {
    if (!idCiclo) throw new Error("ID do ciclo é obrigatório.");

    const hoje = new Date().toISOString().split("T")[0];

    return await apiFetch(`/ciclos-lactacao/${idCiclo}`, {
      method: "PATCH",
      body: JSON.stringify({
        dt_secagem_real: hoje,
        observacao: "Seca",
      }),
    });
  } catch (error) {
    console.error("Erro ao encerrar lactação:", error);
    throw new Error("Falha ao encerrar lactação.");
  }
};
