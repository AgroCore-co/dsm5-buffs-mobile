import { queryAll, queryFirst, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";

export type Filtro = "TODOS" | "PENDENTES";

export type Alerta = {
  idAlerta: string;
  animalId: string;
  grupo: string;
  localizacao: string;
  motivo: string;
  nicho: string;
  dataAlerta: string;
  prioridade: "ALTA" | "MEDIA" | "BAIXA";
  observacao: string;
  visto: boolean;
  idEventoOrigem: string | null;
  tipoEventoOrigem: string | null;
  idPropriedade: string;
  created_at: string;
  updated_at: string;
  nome_animal: string;
  brinco_animal?: string | null;
};

export const getAlertasPorPropriedade = async (
  propriedadeId: string | null,
  filtro: Filtro = "PENDENTES",
  page = 1,
  limit = 10,
) => {
  if (!propriedadeId) {
    return { alertas: [], meta: { page: 1, limit, total: 0, totalPages: 1 } };
  }

  const offset = (page - 1) * limit;
  const vistoFilter = filtro === "PENDENTES" ? `AND json_extract(_raw, '$.visto') = 0` : "";

  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM alertas WHERE propriedadeId = ? ${vistoFilter} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
    [propriedadeId, limit, offset],
  );

  const countRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM alertas WHERE propriedadeId = ? ${vistoFilter}`,
    [propriedadeId],
  );
  const total = countRow?.total ?? 0;

  const alertas: Alerta[] = rows
    .map((r) => {
      const a = JSON.parse(r._raw);
      return {
        ...a,
        prioridade: a.prioridade?.toUpperCase(),
        nome_animal: a.bufalo?.nome ?? "Sem nome",
        brinco_animal: a.bufalo?.brinco ?? null,
      };
    })
    .sort((a, b) => Number(a.visto) - Number(b.visto));

  return {
    alertas,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

export const marcarAlertaVisto = async (id_alerta: string) => {
  const now = new Date().toISOString();

  const existing = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM alertas WHERE id = ?`,
    [id_alerta],
  );

  if (existing) {
    const updated = { ...JSON.parse(existing._raw), visto: true, updatedAt: now };
    await execute(
      `UPDATE alertas SET _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
      [JSON.stringify(updated), now, id_alerta],
    );
  }

  await enqueue("alertas", "UPDATE", { id: id_alerta, visto: true });
};
