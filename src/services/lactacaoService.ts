import { formatarDataBR } from "../utils/date";
import { getEstatisticasLactacao as getEstatisticasLactacaoLocal } from './dashboardService';
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
    `SELECT _raw FROM ciclos_lactacao WHERE propriedadeId = ?
     ORDER BY CASE WHEN status = 'Em Lactação' THEN 0 ELSE 1 END, updatedAt DESC
     LIMIT ? OFFSET ?`,
    [propriedadeId, limit, offset],
  );

  const countRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM ciclos_lactacao WHERE propriedadeId = ?`,
    [propriedadeId],
  );
  const total = countRow?.total ?? 0;

  const bufaloRows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE propriedadeId = ?`,
    [propriedadeId],
  );
  const bufaloMap: Record<string, { brinco: string; nome: string; raca: string }> = {};
  bufaloRows.forEach((br) => {
    const b = JSON.parse(br._raw);
    const key = b.idBufalo ?? b.id;
    if (key) bufaloMap[key] = {
      brinco: b.brinco ?? '-',
      nome: b.nome ?? 'Não informado',
      raca: b.raca?.nome ?? b.nomeRaca ?? 'Não informado',
    };
  });

  const ciclos = rows.map((r) => {
    const c = JSON.parse(r._raw);

    // API pode devolver flat (cicloAtual) ou nested (ciclo_atual.numero_ciclo)
    const cicloAtual: number | null =
      c.cicloAtual ?? c.ciclo_atual?.numero_ciclo ?? c.numeroCiclo ?? null;

    // Dias em lactação: flat > nested > calculado a partir do dtParto
    const dtPartoStr: string | undefined =
      c.dtParto ?? c.ciclo_atual?.dt_parto ?? c.cicloAtualDtParto;
    const diasEmLactacao: number | null =
      c.diasEmLactacao ??
      c.ciclo_atual?.dias_em_lactacao ??
      (dtPartoStr
        ? Math.floor((Date.now() - new Date(dtPartoStr).getTime()) / 86400000)
        : null);

    const dtSecagem: string | undefined =
      c.dtSecagemPrevista ?? c.ciclo_atual?.dt_secagem_prevista;

    return {
      idCicloLactacao: c.idCicloLactacao,
      idBufala: c.idBufala,
      cicloAtual,
      nome: c.bufala?.nome ?? c.nomeBufala ?? bufaloMap[c.idBufala]?.nome ?? "Não informado",
      brinco: c.bufala?.brinco ?? c.brincoBufala ?? bufaloMap[c.idBufala]?.brinco ?? "-",
      status: c.status,
      raca: c.bufala?.raca ?? c.racaBufala ?? bufaloMap[c.idBufala]?.raca ?? "Não informado",
      diasEmLactacao,
      dtSecagemPrevista: dtSecagem ? formatarDataBR(dtSecagem) : "—",
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
  if (!propriedadeId) {
    return { total_ciclos: 0, ciclos_ativos: 0, ciclos_secos: 0, media_dias_lactacao: 0, ciclos_proximos_secagem: 0, ciclos_secagem_atrasada: 0 };
  }
  return getEstatisticasLactacaoLocal(propriedadeId);
};

/* =========================
   GET — INDÚSTRIAS (API — não sincronizável)
========================= */

export const getIndustriasPorPropriedade = async (propriedadeId: string) => {
  try {
    if (!propriedadeId) throw new Error("ID da propriedade é obrigatório.");
    const rows = await queryAll<{ _raw: string }>(
      `SELECT _raw FROM industrias WHERE propriedadeId = ? AND deletedAt IS NULL`,
      [propriedadeId],
    );
    return rows.map(r => {
      const raw = JSON.parse(r._raw);
      return {
        id_industria: raw.id_industria ?? raw.idIndustria ?? raw.id ?? '',
        nome: raw.nome ?? '',
        endereco: raw.endereco ?? '',
        contato: raw.contato,
      } as Industria;
    });
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
  const now = new Date().toISOString();
  const body = {
    id,
    idBufala: payload.id_bufala,
    idPropriedade: String(payload.id_propriedade),
    idCicloLactacao: payload.id_ciclo_lactacao,
    qtOrdenha: payload.qt_ordenha,
    periodo: payload.periodo,
    ocorrencia: payload.ocorrencia ?? "",
    dtOrdenha: payload.dt_ordenha,
  };

  await execute(
    `INSERT INTO ordenhas (id, propriedadeId, bufaloId, idCicloLactacao, _raw, _synced, updatedAt)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [id, body.idPropriedade, body.idBufala, body.idCicloLactacao, JSON.stringify(body), now],
  );

  await enqueue("ordenhas", "CREATE", body);
};

export const registrarColetaApi = async (payload: ColetaRegistroPayload) => {
  const id = uuid.v4() as string;
  await enqueue("retiradas", "CREATE", { ...payload, id });
};

export const registrarEstoqueApi = async (payload: EstoqueRegistroPayload) => {
  const id = uuid.v4() as string;
  const now = new Date().toISOString();
  const body = {
    id,
    idPropriedade: String(payload.id_propriedade),
    quantidade: payload.quantidade,
    dtRegistro: payload.dt_registro,
    observacao: payload.observacao ?? null,
  };

  await execute(
    `INSERT INTO producao_diaria (id, propriedadeId, quantidade, dtRegistro, observacao, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [body.id, body.idPropriedade, body.quantidade, body.dtRegistro, body.observacao, now],
  );

  await enqueue("producao_diaria", "CREATE", body);
};

export const encerrarLactacao = async (idCiclo: string | number) => {
  if (!idCiclo) throw new Error("ID do ciclo é obrigatório.");

  const hoje = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  const existing = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM ciclos_lactacao WHERE id = ?`,
    [String(idCiclo)],
  );
  const merged = {
    ...(existing ? JSON.parse(existing._raw) : {}),
    status: "seco",
    dtSecagemReal: hoje,
    observacao: "Seca",
    updatedAt: now,
  };

  await execute(
    `UPDATE ciclos_lactacao SET status = ?, _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
    ["seco", JSON.stringify(merged), now, String(idCiclo)],
  );
  await enqueue("ciclos_lactacao", "UPDATE", { id: String(idCiclo), dtSecagemReal: hoje, observacao: "Seca", status: "seco" });
};

/* =========================
   GET — PRODUÇÃO DIÁRIA (API — dado agregado)
========================= */

export const getProducaoDiariaAtual = async (propriedadeId: string) => {
  if (!propriedadeId) return { quantidade: 0, dataAtualizacao: "N/D" };
  const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM ordenhas WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId],
  );
  let total = 0;
  for (const row of rows) {
    const o = JSON.parse(row._raw);
    if (o.dtOrdenha && (o.dtOrdenha as string).startsWith(hoje)) {
      total += Number(o.qtOrdenha ?? 0);
    }
  }
  return { quantidade: total, dataAtualizacao: formatarDataBR(hoje) };
};
