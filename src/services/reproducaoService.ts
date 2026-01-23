import { apiFetch } from "../lib/apiClient";

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
  tipo_parto: string; 
}

export interface CicloLactacaoPayload {
  id_bufala: any;      // UUID
  id_propriedade: number; // UUID
  dt_parto: string;       // Formato YYYY-MM-DD
  padrao_dias: number;    // 305
  observacao: string;     
}

const fetchNomeAnimal = async (id: string) => {
  if (!id) return "-";
  try {
    const animal = await apiFetch(`/bufalos/${id}`);
    return animal.nome || id;
  } catch (error) {
    console.error(`Erro ao buscar animal ${id}:`, error);
    return id;
  }
};

const fetchNomeSemenOuOvulo = async (id: string) => {
  if (!id) return "-";
  return `${id.slice(0, 5)}`;
};

export const getReproducaoDashboardStats = async (propriedadeId: number): Promise<ReproducaoDashboardStats> => {
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
  propriedadeId: number, 
  page: number = 1, 
  limit: number = 10
): Promise<{ reproducoes: any[], meta: any }> => {
  if (!propriedadeId) return { reproducoes: [], meta: { totalPages: 1 } };

  try {
    // ⚠️ Removido o loop 'while (hasNextPage)'
    const response: ReproducoesResponse = await apiFetch(
      `/cobertura/propriedade/${propriedadeId}?page=${page}&limit=${limit}`
    );

    const reproducoes: any[] = response.data || [];
    const meta = response.meta || { totalPages: 1 };

    const reproducoesFormatadas = reproducoes.map((r) => {
      // Usando os campos já retornados pela API (nome_femea, brinco_femea, etc.)
      const brincoVaca = r.brinco_femea || r.id_bufala || "-";
      let brincoMacho;
      if (r.brinco_macho) {
        brincoMacho = r.brinco_macho;
      } else if (r.id_semen) {
        brincoMacho = r.id_semen.slice(0, 5); 
      } else if (r.id_ovulo) {
        brincoMacho = r.id_ovulo.slice(0, 5);
      } else {
        brincoMacho = "-";
      }

      return {
        id: r.id_reproducao,
        status: r.status,
        dt_evento: new Date(r.dt_evento).toLocaleDateString("pt-BR"),
        tipoInseminacao:
          r.tipo_inseminacao === "Inseminação Artificial"
            ? "IA"
            : r.tipo_inseminacao === "Monta Natural"
            ? "Natural"
            : "-",
        tipoParto: r.tipo_parto || "-",
        brincoVaca: brincoVaca,
        brincoTouro: brincoMacho, 
        primeiraCria: r.primeira_cria || false,
        id_bufala: r.id_bufala,
        id_bufalo: r.id_bufalo,
        id_semen: r.id_semen, 
        previsaoParto: r.previsaoParto,
        // Adicionar campos brutos necessários para atualização aqui
      };
    });

    return { reproducoes: reproducoesFormatadas, meta };

  } catch (error: any) {
    console.error("Erro ao buscar reproduções:", error);
    return { reproducoes: [], meta: { totalPages: 1 } };
  }
};

export const updateReproducao = async (
  id: string, 
  data: ReproducaoUpdatePayload // Usando a interface de tipagem
) => {
  if (!id) {
    throw new Error("ID da reprodução é obrigatório para atualização.");
  }
  
  try {
    const response = await apiFetch(`/cobertura/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error: any) {
    console.error("Erro ao atualizar reprodução:", error);
    // Lançar o erro com uma mensagem mais clara, se possível
    throw new Error(error.message || "Erro desconhecido ao atualizar reprodução.");
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
