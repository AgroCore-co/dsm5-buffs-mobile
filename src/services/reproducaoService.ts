import { formatarDataBR } from "../utils/date";
import { getReproducaoMetricas } from './dashboardService';
import { queryAll, queryFirst, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";

export interface ReproducaoDashboardStats {
  totalEmAndamento: number;
  totalConfirmada: number;
  totalFalha: number;
  ultimaDataReproducao: string;
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
  id_bufala: any;
  id_propriedade: number;
  dt_parto: string;
  padrao_dias: number;
  observacao: string;
}

export interface RegistrarPartoPayload {
  dt_parto: string;
  tipo_parto: string;
  observacao?: string;
  criar_ciclo_lactacao: boolean;
  padrao_dias_lactacao?: number;
}

// Dashboard stats — lê SQLite via dashboardService
export const getReproducaoDashboardStats = async (propriedadeId: string): Promise<ReproducaoDashboardStats> => {
  if (!propriedadeId) {
    return { totalEmAndamento: 0, totalConfirmada: 0, totalFalha: 0, ultimaDataReproducao: '-' };
  }
  const result = await getReproducaoMetricas(propriedadeId);
  return {
    totalEmAndamento: result.totalEmAndamento,
    totalConfirmada: result.totalConfirmada,
    totalFalha: result.totalFalha,
    ultimaDataReproducao: result.ultimaDataReproducao ?? '-',
  };
};

export const getReproducoes = async (
  propriedadeId: string,
  page = 1,
  limit = 10,
): Promise<{ reproducoes: any[]; meta: any }> => {
  if (!propriedadeId) {
    return { reproducoes: [], meta: { page: 1, limit, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false } };
  }

  const offset = (page - 1) * limit;
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM reproducoes WHERE propriedadeId = ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
    [propriedadeId, limit, offset],
  );

  const countRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM reproducoes WHERE propriedadeId = ?`,
    [propriedadeId],
  );
  const total = countRow?.total ?? 0;

  const reproducoes = rows.map((row) => {
    const r = JSON.parse(row._raw);
    const femea = r.bufalo_idBufala;
    const macho = r.bufalo_idBufalo;
    return {
      id: r.idReproducao ?? r.id,
      status: r.status,
      tipoInseminacao:
        r.tipoInseminacao === "Inseminação Artificial" ? "IA"
        : r.tipoInseminacao === "Monta Natural" ? "Natural"
        : "-",
      tipoParto: r.tipoParto ?? "-",
      dtEvento: r.dtEvento ? formatarDataBR(r.dtEvento) : "-",
      ocorrencia: r.ocorrencia ?? "-",
      idBufala: r.idBufala,
      nomeFemea: femea?.nome ?? "Não informado",
      brincoFemea: femea?.brinco ?? "-",
      idBufalo: r.idBufalo,
      nomeMacho: macho?.nome ?? (r.idSemen ? "Sêmen" : "-"),
      brincoMacho: macho?.brinco ?? (r.idSemen || r.idOvulo ? (r.idSemen || r.idOvulo).slice(0, 5) : "-"),
      idSemen: r.idSemen,
      idOvulo: r.idOvulo,
      previsaoParto: r.previsaoParto,
      primeiraCria: r.primeiraCria ?? false,
    };
  });

  return {
    reproducoes,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
  };
};

export const createReproducao = async (data: any) => {
  const id = uuid.v4() as string;
  const now = new Date().toISOString();
  const newRecord = { ...data, id, createdAt: now, updatedAt: now };

  await execute(
    `INSERT INTO reproducoes (id, bufaloId, propriedadeId, tipo, _raw, _synced, updatedAt)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [id, data.idBufala ?? data.id_bufala, data.idPropriedade ?? data.id_propriedade, data.tipoInseminacao ?? null, JSON.stringify(newRecord), now],
  );
  await enqueue("reproducoes", "CREATE", newRecord);
  return newRecord;
};

export const createCicloLactacao = async (data: CicloLactacaoPayload) => {
  const id = uuid.v4() as string;
  await enqueue("ciclos_lactacao", "CREATE", { ...data, id });
  return { id };
};

export const updateReproducao = async (id: string, data: ReproducaoUpdatePayload) => {
  if (!id) throw new Error("ID da reprodução é obrigatório.");

  const existing = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM reproducoes WHERE id = ?`,
    [id],
  );
  const now = new Date().toISOString();
  const merged = { ...(existing ? JSON.parse(existing._raw) : {}), ...data, id, updatedAt: now };

  await execute(
    `UPDATE reproducoes SET _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
    [JSON.stringify(merged), now, id],
  );
  await enqueue("reproducoes", "UPDATE", merged);
  return merged;
};

export const registrarParto = async (id: string, data: RegistrarPartoPayload) => {
  if (!id) throw new Error("ID da reprodução é obrigatório.");

  const now = new Date().toISOString();
  const payload = { id, ...data, status: "CONCLUIDA", updatedAt: now };

  await execute(
    `UPDATE reproducoes SET _raw = json_patch(_raw, ?), _synced = 0, updatedAt = ? WHERE id = ?`,
    [JSON.stringify({ status: "CONCLUIDA", ...data }), now, id],
  );
  await enqueue("reproducoes", "UPDATE", payload);
  return payload;
};
