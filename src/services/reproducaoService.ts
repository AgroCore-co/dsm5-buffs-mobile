import { formatarDataBR } from "../utils/date";
import { getReproducaoMetricas } from './dashboardService';
import { queryAll, queryFirst, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";
import { normalizePayload } from '../utils/normalizePayload';

export const getMaterialGenetico = async (propriedadeId: string) => {
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM material_genetico WHERE propriedadeId = ?`,
    [propriedadeId],
  );

  if (__DEV__ && rows.length === 0) {
    const all = await queryAll<{ id: string; propriedadeId: string }>(
      `SELECT id, propriedadeId FROM material_genetico LIMIT 20`
    );
    console.warn(
      `[getMaterialGenetico] 0 rows para propriedadeId="${propriedadeId}". ` +
      `Total na tabela: ${all.length}. IDs/props: ` +
      JSON.stringify(all.map(r => ({ id: r.id?.slice(0, 8), prop: r.propriedadeId?.slice(0, 8) })))
    );
  } else if (__DEV__) {
    const sample = JSON.parse(rows[0]._raw);
    console.log(
      `[getMaterialGenetico] ${rows.length} materiais encontrados. ` +
      `Sample tipo="${sample.tipo}", fornecedor="${sample.fornecedor}", idMaterial="${sample.idMaterial ?? sample.id}"`
    );
  }

  return rows.map(r => {
    const m = JSON.parse(r._raw);
    const id = m.idMaterial ?? m.id;
    const label = [m.fornecedor, m.tipo].filter(Boolean).join(' — ') || id;
    // id_bufalo_origem = búfala doadora do óvulo, necessário para TE como idDoadora
    const idBufalOrigem = m.id_bufalo_origem ?? m.idBufalOrigem ?? m.idBufaloOrigem ?? null;
    return { id, label, tipo: m.tipo ?? '', fornecedor: m.fornecedor ?? '', idBufalOrigem };
  });
};

export interface ReproducaoDashboardStats {
  totalEmAndamento: number;
  totalConfirmada: number;
  totalConcluida: number;
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
    return { totalEmAndamento: 0, totalConfirmada: 0, totalConcluida: 0, totalFalha: 0, ultimaDataReproducao: '-' };
  }
  const result = await getReproducaoMetricas(propriedadeId);
  return {
    totalEmAndamento: result.totalEmAndamento,
    totalConfirmada: result.totalConfirmada,
    totalConcluida: result.totalConcluida,
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
    `SELECT _raw FROM reproducoes WHERE propriedadeId = ?
     ORDER BY CASE json_extract(_raw, '$.status')
       WHEN 'Em andamento' THEN 0
       WHEN 'Confirmada'   THEN 1
       WHEN 'Concluída'    THEN 2
       ELSE 3
     END, updatedAt DESC
     LIMIT ? OFFSET ?`,
    [propriedadeId, limit, offset],
  );

  const countRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM reproducoes WHERE propriedadeId = ?`,
    [propriedadeId],
  );
  const total = countRow?.total ?? 0;

  const bufaloRows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE propriedadeId = ?`,
    [propriedadeId],
  );
  const bufaloMap: Record<string, { brinco: string; nome: string }> = {};
  bufaloRows.forEach((br) => {
    const b = JSON.parse(br._raw);
    const key = b.idBufalo ?? b.id;
    if (key) bufaloMap[key] = { brinco: b.brinco ?? '-', nome: b.nome ?? 'Não informado' };
  });

  const matRows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM material_genetico WHERE propriedadeId = ?`,
    [propriedadeId],
  );
  const matMap: Record<string, { label: string; fornecedor: string }> = {};
  matRows.forEach((mr) => {
    const m = JSON.parse(mr._raw);
    const key = m.idMaterial ?? m.id;
    if (key) matMap[key] = {
      label: [m.fornecedor, m.tipo].filter(Boolean).join(' — ') || key.slice(0, 8),
      fornecedor: m.fornecedor ?? key.slice(0, 8),
    };
  });

  const reproducoes = rows.map((row) => {
    const r = JSON.parse(row._raw);
    const femea = r.bufalo_idBufala;
    const macho = r.bufalo_idBufalo;
    const femeaFallback = bufaloMap[r.idBufala];
    const machoFallback = bufaloMap[r.idBufalo];
    return {
      id: r.idReproducao ?? r.id,
      status: r.status,
      tipoInseminacao:
        (r.tipoInseminacao === "Inseminação Artificial" || r.tipoInseminacao === "IA") ? "IA"
        : r.tipoInseminacao === "Monta Natural" ? "Natural"
        : r.tipoInseminacao ?? "-",
      tipoParto: r.tipoParto ?? "-",
      dtEvento: r.dtEvento ? formatarDataBR(r.dtEvento) : "-",
      ocorrencia: r.ocorrencia ?? "-",
      idBufala: r.idBufala,
      nomeFemea: femea?.nome ?? femeaFallback?.nome ?? "Não informado",
      brincoFemea: femea?.brinco ?? femeaFallback?.brinco ?? "-",
      idBufalo: r.idBufalo,
      nomeMacho: macho?.nome ?? machoFallback?.nome ?? (r.idSemen ? matMap[r.idSemen]?.fornecedor ?? "Sêmen" : (r.idOvulo ? matMap[r.idOvulo]?.fornecedor ?? "Óvulo" : "-")),
      brincoMacho: macho?.brinco ?? machoFallback?.brinco ?? (r.idSemen ? matMap[r.idSemen]?.label ?? r.idSemen.slice(0, 8) : (r.idOvulo ? matMap[r.idOvulo]?.label ?? r.idOvulo.slice(0, 8) : "-")),
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

const CICLO_FIELD_MAP = {
  idPropriedade: ['id_propriedade', 'idPropriedade'],
  idBufala:      ['id_bufala'],
  dtParto:       ['dt_parto'],
  padraoDias:    ['padrao_dias', 'padrao_dias_lactacao'],
  dtSecagemReal: ['dt_secagem_real'],
};

export const createCicloLactacao = async (data: any) => {
  const d = normalizePayload(data, CICLO_FIELD_MAP);
  const id = uuid.v4() as string;
  const now = new Date().toISOString();

  const newRecord = {
    ...d,
    id,
    status: 'Em Lactação',
    createdAt: now,
    updatedAt: now,
  };

  await execute(
    `INSERT INTO ciclos_lactacao (id, propriedadeId, idBufala, status, _raw, _synced, updatedAt)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [id, d.idPropriedade ?? null, d.idBufala ?? null, 'Em Lactação', JSON.stringify(newRecord), now],
  );

  await enqueue('ciclos_lactacao', 'CREATE', newRecord);
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

  const existing = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM reproducoes WHERE id = ?`,
    [id],
  );
  const reproducaoRaw = existing ? JSON.parse(existing._raw) : {};

  const now = new Date().toISOString();
  const payload = { id, ...data, status: "CONCLUIDA", updatedAt: now };

  await execute(
    `UPDATE reproducoes SET _raw = json_patch(_raw, ?), _synced = 0, updatedAt = ? WHERE id = ?`,
    [JSON.stringify({ status: "CONCLUIDA", ...data }), now, id],
  );
  await enqueue("reproducoes", "UPDATE", payload);

  if (data.criar_ciclo_lactacao === true) {
    await createCicloLactacao({
      id_bufala: reproducaoRaw.idBufala,
      id_propriedade: reproducaoRaw.idPropriedade,
      dt_parto: data.dt_parto,
      padrao_dias: data.padrao_dias_lactacao ?? 305,
      observacao: data.observacao ?? '',
    });
  }

  return payload;
};
