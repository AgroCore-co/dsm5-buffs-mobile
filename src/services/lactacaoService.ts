import { apiFetch } from "../lib/apiClient";
import { formatarDataBR } from "../utils/date";
import { queryAll, queryFirst, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";

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
  idIndustria: string;
  idPropriedade: string;
  resultadoTeste: boolean;
  observacao?: string;
  quantidade: number;
  dtColeta: string;
}

export interface EstoqueRegistroPayload {
  id_propriedade: string | number;
  id_usuario: string;
  quantidade: number;
  dt_registro: string;
  observacao?: string;
}

/* =========================
   GET — CICLOS DE LACTAÇÃO (SQLite)
========================= */

export const getCiclosLactacao = async (
  propriedadeId: string,
  page = 1,
  limit = 10
) => {
  if (!propriedadeId) {
    return { ciclos: [], meta: { page: 1, totalPages: 1, totalItems: 0 } };
  }

  const offset = (page - 1) * limit;
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM ciclos_lactacao WHERE propriedadeId = ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
    [propriedadeId, limit, offset],
  );

  const countRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM ciclos_lactacao WHERE propriedadeId = ?`,
    [propriedadeId],
  );
  const total = countRow?.total ?? 0;

  const ciclos = rows.map((r) => {
    const c = JSON.parse(r._raw);
    return {
      idCicloLactacao: c.idCicloLactacao,
      idBufala: c.idBufala,
      cicloAtual: c.cicloAtual,
      nome: c.bufala?.nome ?? "Não informado",
      brinco: c.bufala?.brinco ?? "-",
      status: c.status,
      raca: c.bufala?.raca ?? "Não informado",
      diasEmLactacao: c.diasEmLactacao,
      dtSecagemPrevista: c.dtSecagemPrevista
        ? formatarDataBR(c.dtSecagemPrevista)
        : "—",
    };
  });

  return {
    ciclos,
    meta: { page, totalPages: Math.max(1, Math.ceil(total / limit)), totalItems: total },
  };
};

/* =========================
   GET — ESTATÍSTICAS (API — dados computados)
========================= */

export const getEstatisticasLactacao = async (propriedadeId: string) => {
  try {
    if (!propriedadeId) throw new Error("ID da propriedade é obrigatório.");
    return await apiFetch(`/lactacao/propriedade/${propriedadeId}/estatisticas`);
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
   GET — INDÚSTRIAS (API — não sincronizável)
========================= */

export const getIndustriasPorPropriedade = async (propriedadeId: string) => {
  try {
    if (!propriedadeId) throw new Error("ID da propriedade é obrigatório.");
    const response: Industria[] = await apiFetch(`/laticinios/propriedade/${propriedadeId}`);
    return response || [];
  } catch (error) {
    console.error("Erro ao buscar indústrias da propriedade:", error);
    return [];
  }
};

/* =========================
   POST / PATCH — offline queue
========================= */

export const registrarLactacaoApi = async (payload: LactacaoRegistroPayload) => {
  const id = uuid.v4() as string;
  await enqueue("ciclos_lactacao", "CREATE", { ...payload, id });
};

export const registrarColetaApi = async (payload: ColetaRegistroPayload) => {
  const id = uuid.v4() as string;
  await enqueue("ciclos_lactacao", "CREATE", { ...payload, id });
};

export const registrarEstoqueApi = async (payload: EstoqueRegistroPayload) => {
  const id = uuid.v4() as string;
  await enqueue("ciclos_lactacao", "CREATE", { ...payload, id });
};

export const encerrarLactacao = async (idCiclo: string | number) => {
  if (!idCiclo) throw new Error("ID do ciclo é obrigatório.");

  const hoje = new Date().toISOString().split("T")[0];
  const updatePayload = { id: String(idCiclo), dt_secagem_real: hoje, observacao: "Seca", status: "seco" };

  await execute(
    `UPDATE ciclos_lactacao SET status = ?, _synced = 0 WHERE id = ?`,
    ["seco", String(idCiclo)],
  );
  await enqueue("ciclos_lactacao", "UPDATE", updatePayload);
};

/* =========================
   GET — PRODUÇÃO DIÁRIA (API — dado agregado)
========================= */

export const getProducaoDiariaAtual = async (propriedadeId: string) => {
  try {
    if (!propriedadeId) throw new Error("ID da propriedade é obrigatório.");

    const response: { data: { quantidade: string; dt_registro: string }[] } = await apiFetch(
      `/producao-diaria/propriedade/${propriedadeId}?page=1&limit=1`
    );

    const registro = response?.data?.[0];
    if (!registro) return { quantidade: 0, dataAtualizacao: "N/D" };

    return {
      quantidade: Number(registro.quantidade),
      dataAtualizacao: formatarDataBR(registro.dt_registro),
    };
  } catch (error) {
    console.error("Erro ao buscar produção diária:", error);
    return { quantidade: 0, dataAtualizacao: "N/D" };
  }
};
