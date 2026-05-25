import { queryAll, queryFirst, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";
import { normalizePayload } from '../utils/normalizePayload';

export interface Medicacao {
  id_medicacao: string;
  medicacao: string;
  descricao: string;
  tipo_tratamento: string;
}

const SANITARIO_FIELD_MAP = {
  idBufalo:         ['id_bufalo'],
  idPropriedade:    ['id_propriedade'],
  idMedicao:        ['id_medicao', 'idMedicacao', 'id_medicacao'],
  dtAplicacao:      ['dt_aplicacao'],
  dtRetorno:        ['dt_retorno'],
  unidadeMedida:    ['unidade_medida'],
  necessitaRetorno: ['necessita_retorno'],
};

export const sanitarioService = {
  add: async (payload: any) => {
    const d = normalizePayload(payload, SANITARIO_FIELD_MAP);
    const id = uuid.v4() as string;
    const now = new Date().toISOString();
    const newRecord = { ...d, id, createdAt: now, updatedAt: now };

    await execute(
      `INSERT INTO eventos_sanitarios (id, bufaloId, propriedadeId, tipo, _raw, _synced, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, d.idBufalo ?? null, d.idPropriedade ?? null, d.tipo ?? null, JSON.stringify(newRecord), now],
    );
    await enqueue("eventos_sanitarios", "CREATE", newRecord);
    return newRecord;
  },

  getHistorico: async (id_bufalo: string, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const rows = await queryAll<{ _raw: string }>(
      `SELECT _raw FROM eventos_sanitarios WHERE bufaloId = ? ORDER BY json_extract(_raw, '$.dtAplicacao') DESC LIMIT ? OFFSET ?`,
      [id_bufalo, limit, offset],
    );

    const countRow = await queryFirst<{ total: number }>(
      `SELECT COUNT(*) as total FROM eventos_sanitarios WHERE bufaloId = ?`,
      [id_bufalo],
    );
    const total = countRow?.total ?? 0;

    const medRows = await queryAll<{ _raw: string }>(`SELECT _raw FROM medicamentos`);
    const medMap: Record<string, string> = {};
    medRows.forEach((r) => {
      const med = JSON.parse(r._raw);
      const key = med.idMedicacao ?? med.id;
      if (key) medMap[key] = med.medicacao ?? med.nome ?? '';
    });

    const data = rows.map((r) => {
      const reg = JSON.parse(r._raw);
      const nomeMed =
        reg.medicacoe?.medicacao ??
        medMap[reg.idMedicao] ??
        'Medicamento Desconhecido';
      return {
        ...reg,
        idSanit: reg.idSanit ?? reg.id,
        nome_medicamento: nomeMed,
        tipo_tratamento: reg.medicacoe?.tipoTratamento ?? '-',
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
    const normalized = normalizePayload(payload, SANITARIO_FIELD_MAP);
    const merged = { ...(existing ? JSON.parse(existing._raw) : {}), ...normalized, id: id_sanit, updatedAt: now };

    await execute(
      `UPDATE eventos_sanitarios SET _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
      [JSON.stringify(merged), now, id_sanit],
    );
    await enqueue("eventos_sanitarios", "UPDATE", merged);
    return merged;
  },
};

export default sanitarioService;
