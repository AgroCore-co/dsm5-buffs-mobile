import { apiFetch } from "../lib/apiClient";
import { formatarDataBR } from "../utils/date";

export interface ReproducaoDashboardStats {
  totalEmAndamento: number;
  totalConfirmada: number;
  totalFalha: number;
  ultimaDataReproducao: string; // Ex: "2025-11-10"
}

export interface ReproducoesResponse {
  data: any[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ReproducaoUpdatePayload {
  status: string;
  tipo_parto?: string;
}

export interface CicloLactacaoPayload {
  id_bufala: any;      // UUID
  id_propriedade: number; // UUID
  dt_parto: string;       // Formato YYYY-MM-DD
  padrao_dias: number;    // 305
  observacao: string;     
}

export const getReproducaoDashboardStats = async (propriedadeId: string): Promise<ReproducaoDashboardStats> => {
  if (!propriedadeId) {
    return {
      totalEmAndamento: 0,
      totalConfirmada: 0,
      totalFalha: 0,
      ultimaDataReproducao: "-",
    };
  }
  
  try {
    const response = await apiFetch(`/dashboard/reproducao/${propriedadeId}`);
    return {
      totalEmAndamento: response.totalEmAndamento || 0,
      totalConfirmada: response.totalConfirmada || 0,
      totalFalha: response.totalFalha || 0,
      ultimaDataReproducao: response.ultimaDataReproducao || "-",
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas do dashboard de reprodução:", error);
    return {
      totalEmAndamento: 0,
      totalConfirmada: 0,
      totalFalha: 0,
      ultimaDataReproducao: "-",
    };
  }
};

export const getReproducoes = async (
  propriedadeId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ reproducoes: any[]; meta: any }> => {
  if (!propriedadeId) {
    return {
      reproducoes: [],
      meta: {
        page: 1,
        limit,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  try {
    const response: ReproducoesResponse = await apiFetch(
      `/cobertura/propriedade/${propriedadeId}?page=${page}&limit=${limit}`
    );

    const reproducoesFormatadas = (response.data || []).map((r: any) => {
      const femea = r.bufalo_idBufala;
      const macho = r.bufalo_idBufalo;

      return {
        id: r.idReproducao,
        status: r.status,

        tipoInseminacao:
          r.tipoInseminacao === "Inseminação Artificial"
            ? "IA"
            : r.tipoInseminacao === "Monta Natural"
            ? "Natural"
            : "-",

        tipoParto: r.tipoParto ?? "-",
        dtEvento: formatarDataBR(r.dtEvento),
        ocorrencia: r.ocorrencia ?? "-",

        // Fêmea
        idBufala: r.idBufala,
        nomeFemea: femea?.nome ?? "Não informado",
        brincoFemea: femea?.brinco ?? "-",

        // Macho / sêmen / óvulo
        idBufalo: r.idBufalo,
        nomeMacho: macho?.nome ?? (r.idSemen ? "Sêmen" : "-"),
        brincoMacho: macho?.brinco ?? (r.idSemen || r.idOvulo ? (r.idSemen || r.idOvulo).slice(0, 5) : "-"),

        // IDs brutos (mantidos para edição)
        idSemen: r.idSemen,
        idOvulo: r.idOvulo,
        previsaoParto: r.previsaoParto,
        primeiraCria: r.primeiraCria ?? false,
      };
    });

    return {
      reproducoes: reproducoesFormatadas,
      meta: response.meta,
    };
  } catch (error) {
    console.error("Erro ao buscar reproduções:", error);
    return {
      reproducoes: [],
      meta: {
        page: 1,
        limit,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }
};

export const createReproducao = async (data: any) => {
  try {
    const response = await apiFetch("/cobertura", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error) {
    console.error("Erro ao criar reprodução:", error);
    throw error;
  }
};

export const createCicloLactacao = async (data: CicloLactacaoPayload) => {
  try {
    const response = await apiFetch("/ciclos-lactacao", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error) {
    console.error("Erro ao criar ciclo de lactação:", error);
    throw error;
  }
};



export interface RegistrarPartoPayload {
  dt_parto: string;
  tipo_parto: string;
  observacao?: string;
  criar_ciclo_lactacao: boolean;
  padrao_dias_lactacao?: number;
}

/**
 * Atualiza reprodução APENAS para FALHA ou EM ANDAMENTO
 */
export const updateReproducao = async (
  id: string,
  data: ReproducaoUpdatePayload
) => {
  if (!id) {
    throw new Error("ID da reprodução é obrigatório.");
  }

  return apiFetch(`/cobertura/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
};

/**
 * Registra parto (CONCLUÍDA)
 * 👉 Backend controla status + ciclo de lactação
 */
export const registrarParto = async (
  id: string,
  data: RegistrarPartoPayload
) => {
  if (!id) {
    throw new Error("ID da reprodução é obrigatório.");
  }

  return apiFetch(`/cobertura/${id}/registrar-parto`, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
};
