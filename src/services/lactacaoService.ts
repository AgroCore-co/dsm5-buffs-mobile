import { apiFetch } from "../lib/apiClient";

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
  id_propriedade: string | number; // Se for UUID, use string
  id_usuario: string; // OBRIGATÓRIO no payload da API
  quantidade: number;
  dt_registro: string; // ISOString (ex: "2025-08-18T18:00:00.000Z")
  observacao?: string;
}

export const getCiclosLactacao = async (propriedadeId: number) => {
  try {
    if (!propriedadeId) throw new Error("ID da propriedade é obrigatório.");

    const ciclos: CicloLactacao[] = await apiFetch(
      `/lactacao/femeas/em-lactacao/${propriedadeId}`
    );

    const estoqueResponse: { data: EstoqueLeite[] } = await apiFetch(
      `/estoque-leite/propriedade/${propriedadeId}`
    );

    const estoqueAtual = estoqueResponse?.data?.[0] || null;

    const totalLactando = ciclos.length;
    const quantidadeAtual = estoqueAtual?.quantidade || 0;
    const dataFormatada = estoqueAtual?.dt_registro
      ? new Date(estoqueAtual.dt_registro).toLocaleDateString("pt-BR")
      : "N/D";

    const ciclosFormatados = ciclos.map((c) => ({
      id: c.id_bufalo,
      nome: c.nome,
      brinco: c.brinco,
      raca: c.raca,
      idadeMeses: c.idade_meses,
      numeroCiclo: c.ciclo_atual.numero_ciclo,
      diasEmLactacao: c.ciclo_atual.dias_em_lactacao,
      status: c.ciclo_atual.status,
      producaoTotal: c.producao_atual.total_produzido,
      mediaDiaria: c.producao_atual.media_diaria,
      idCicloLactacao: c.ciclo_atual.id_ciclo_lactacao,
      ultimaOrdenha: c.producao_atual.ultima_ordenha
        ? {
            data: new Date(c.producao_atual.ultima_ordenha.data).toLocaleDateString("pt-BR"),
            quantidade: c.producao_atual.ultima_ordenha.quantidade,
            periodo: c.producao_atual.ultima_ordenha.periodo,
          }
        : null,
    }));

    return {
      ciclos: ciclosFormatados,
      totalLactando,
      quantidadeAtual,
      dataFormatada,
    };
  } catch (error: any) {
    console.error("Erro ao buscar ciclos de lactação:", error);
    return {
      ciclos: [],
      totalLactando: 0,
      quantidadeAtual: 0,
      dataFormatada: "N/D",
    };
  }
};


export const getIndustriasPorPropriedade = async (propriedadeId: number) => {
  try {
    if (!propriedadeId) throw new Error("ID da propriedade é obrigatório.");

    const response: Industria[] = await apiFetch(
      `/industrias/propriedade/${propriedadeId}`
    );
    return response || [];
    
  } catch (error: any) {
    console.error("Erro ao buscar indústrias da propriedade:", error);
    return [];
  }
};


export const registrarLactacaoApi = async (payload: LactacaoRegistroPayload) => {
  try {
    const response = await apiFetch("/lactacao", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response;
  } catch (error) {
    console.error("Erro ao registrar lactação na API:", error);
    throw new Error("Falha ao registrar lactação.");
  }
};

export const registrarColetaApi = async (payload: ColetaRegistroPayload) => {
  try {
    const response = await apiFetch("/coletas", { 
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response;
  } catch (error) {
    console.error("Erro ao registrar coleta na API:", error);
    throw new Error("Falha ao registrar coleta.");
  }
};

export const registrarEstoqueApi = async (payload: EstoqueRegistroPayload) => {
  try {
    const response = await apiFetch("/estoque-leite", { 
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response;
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