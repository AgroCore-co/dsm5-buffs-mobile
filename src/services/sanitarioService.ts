import { sanitarioToApiAdapter } from "./adapters/bufaloAdapter";
import { queryAll, queryFirst, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";

export interface Medicacao {
  id_medicacao: string;
  medicacao: string;
  descricao: string;
  tipo_tratamento: string;
}

export const sanitarioService = {
  add: async (payload: any) => {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();
    const adapted = sanitarioToApiAdapter(payload);
    const newRecord = { ...adapted, id, createdAt: now, updatedAt: now };

    await execute(
      `INSERT INTO eventos_sanitarios (id, bufaloId, propriedadeId, tipo, _raw, _synced, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, payload.id_bufalo, payload.id_propriedade, payload.tipo ?? null, JSON.stringify(newRecord), now],
    );
    await enqueue("eventos_sanitarios", "CREATE", newRecord);
    return newRecord;
  },

  getHistorico: async (id_bufalo: string, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const rows = await queryAll<{ _raw: string }>(
      `SELECT _raw FROM eventos_sanitarios WHERE bufaloId = ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
      [id_bufalo, limit, offset],
    );

    const countRow = await queryFirst<{ total: number }>(
      `SELECT COUNT(*) as total FROM eventos_sanitarios WHERE bufaloId = ?`,
      [id_bufalo],
    );
    const total = countRow?.total ?? 0;

    const data = rows.map((r) => {
      const reg = JSON.parse(r._raw);
      return {
        ...reg,
        nome_medicamento: reg.medicacoe?.medicacao ?? "Medicamento Desconhecido",
        tipo_tratamento: reg.medicacoe?.tipoTratamento ?? "-",
      };
    });

    return {
      data,
      meta: { page, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  },

  getMedicamentos: async () => {
    const rows = await queryAll<{ _raw: string }>(`SELECT _raw FROM medicamentos`);
    return rows.map((r) => JSON.parse(r._raw));
  },

  getMedicamentosByPropriedade: async (idPropriedade: string): Promise<Medicacao[]> => {
    const rows = await queryAll<{ _raw: string }>(`SELECT _raw FROM medicamentos`);
    return rows.map((r) => {
      const item = JSON.parse(r._raw);
      return {
        id_medicacao: item.idMedicacao ?? item.id,
        medicacao: item.medicacao,
        tipo_tratamento: item.tipoTratamento,
        descricao: item.descricao,
      };
    });
  },

  delete: async (id_sanit: string) => {
    await execute(`DELETE FROM eventos_sanitarios WHERE id = ?`, [id_sanit]);
    await enqueue("eventos_sanitarios", "DELETE", { id: id_sanit });
    return true;
  },

  update: async (id_sanit: string, payload: any) => {
    const existing = await queryFirst<{ _raw: string }>(
      `SELECT _raw FROM eventos_sanitarios WHERE id = ?`,
      [id_sanit],
    );

    const now = new Date().toISOString();
    const adapted = sanitarioToApiAdapter(payload);
    const merged = { ...(existing ? JSON.parse(existing._raw) : {}), ...adapted, id: id_sanit, updatedAt: now };

    await execute(
      `UPDATE eventos_sanitarios SET _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
      [JSON.stringify(merged), now, id_sanit],
    );
    await enqueue("eventos_sanitarios", "UPDATE", merged);
    return merged;
  },
};

export default sanitarioService;
