import { queryAll, queryFirst, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";
import { normalizePayload } from '../utils/normalizePayload';

const ZOOTEC_FIELD_MAP = {
  condicaoCorporal: ['condicao_corporal'],
  corPelagem:       ['cor_pelagem'],
  formatoChifre:    ['formato_chifre'],
  porteCorporal:    ['porte_corporal'],
  tipoPesagem:      ['tipo_pesagem'],
  dtRegistro:       ['dt_registro'],
  idPropriedade:    ['id_propriedade'],
};

export const zootecService = {
  getHistorico: async (id_bufalo: string, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const rows = await queryAll<{ _raw: string }>(
      `SELECT _raw FROM pesagens WHERE bufaloId = ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
      [id_bufalo, limit, offset],
    );

    const countRow = await queryFirst<{ total: number }>(
      `SELECT COUNT(*) as total FROM pesagens WHERE bufaloId = ?`,
      [id_bufalo],
    );
    const total = countRow?.total ?? 0;

    return {
      data: rows.map((r) => {
        const item = JSON.parse(r._raw);
        return { ...item, idZootec: item.idZootec ?? item.id };
      }),
      meta: { page, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  },

  add: async (id_bufalo: string, payload: any) => {
    const d = normalizePayload(payload, ZOOTEC_FIELD_MAP);
    const id = uuid.v4() as string;
    const now = new Date().toISOString();
    const newRecord = { ...d, id, idZootec: id, bufaloId: id_bufalo, createdAt: now, updatedAt: now };

    await execute(
      `INSERT INTO pesagens (id, bufaloId, propriedadeId, _raw, _synced, updatedAt)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [id, id_bufalo, d.idPropriedade ?? null, JSON.stringify(newRecord), now],
    );
    await enqueue("pesagens", "CREATE", newRecord);
    return newRecord;
  },

  update: async (id_zootec: string, payload: any) => {
    const normalized = normalizePayload(payload, ZOOTEC_FIELD_MAP);
    const now = new Date().toISOString();

    const existing = await queryFirst<{ _raw: string }>(
      `SELECT _raw FROM pesagens WHERE id = ?`,
      [id_zootec],
    );
    const merged = { ...(existing ? JSON.parse(existing._raw) : {}), ...normalized, id: id_zootec, updatedAt: now };

    await execute(
      `UPDATE pesagens SET _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
      [JSON.stringify(merged), now, id_zootec],
    );
    await enqueue("pesagens", "UPDATE", merged);
    return merged;
  },

  delete: async (id_zootec: number) => {
    await execute(`DELETE FROM pesagens WHERE id = ?`, [String(id_zootec)]);
    await enqueue("pesagens", "DELETE", { id: String(id_zootec) });
    return true;
  },
};

export default zootecService;
