import uuid from 'react-native-uuid';
import { queryAll, queryFirst, execute } from '../database/db';
import { enqueue } from './pendingOperationsService';
import { grupoService, Grupo } from './grupoService';

export const getBufalos = async (
  propriedadeId: string,
  page = 1,
  limit = 10,
) => {
  const offset = (page - 1) * limit;
  const rows = await queryAll<any>(
    `SELECT _raw FROM bufalos WHERE propriedadeId = ? AND id IS NOT NULL AND (_raw NOT LIKE '%"deletedAt":%' OR _raw LIKE '%"deletedAt":null%') ORDER BY brinco ASC LIMIT ? OFFSET ?`,
    [propriedadeId, limit, offset],
  );

  const countRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM bufalos WHERE propriedadeId = ? AND id IS NOT NULL AND (_raw NOT LIKE '%"deletedAt":%' OR _raw LIKE '%"deletedAt":null%')`,
    [propriedadeId],
  );
  const total = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const bufalos = rows.map((r) => {
    const b = JSON.parse(r._raw);
    return { ...b, racaNome: b.raca?.nome || b.nomeRaca || 'Desconhecida' };
  });

  return {
    bufalos,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

export const getBufaloDetalhes = async (id: string) => {
  const row = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE id = ?`,
    [id],
  );
  if (!row) throw new Error(`Búfalo ${id} não encontrado`);

  const bufalo = JSON.parse(row._raw);
  return {
    ...bufalo,
    racaNome: bufalo.nomeRaca || bufalo.raca?.nome || 'Desconhecida',
    paiNome: bufalo.brincoPai ?? bufalo.materialGeneticoMachoNome ?? 'Desconhecido',
    maeNome: bufalo.brincoMae ?? bufalo.materialGeneticoFemeaNome ?? 'Desconhecida',
  };
};

export const createBufalo = async (data: any) => {
  const id = data.id ?? (uuid.v4() as string);
  const now = new Date().toISOString();
  const newRecord = { ...data, id, createdAt: now, updatedAt: now };

  await execute(
    `INSERT INTO bufalos (id, propriedadeId, brinco, sexo, nivelMaturidade, status, idRaca, _raw, _synced, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, data.propriedadeId, data.brinco, data.sexo, data.nivelMaturidade, data.status ? 1 : 0, data.idRaca, JSON.stringify(newRecord), now],
  );

  await enqueue('bufalos', 'CREATE', newRecord);
  return newRecord;
};

export const updateBufalo = async (id: string, data: any) => {
  const existing = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE id = ?`,
    [id],
  );
  if (!existing) throw new Error(`Búfalo ${id} não encontrado`);

  const now = new Date().toISOString();
  const merged = { ...JSON.parse(existing._raw), ...data, updatedAt: now };

  await execute(
    `UPDATE bufalos SET brinco = ?, sexo = ?, nivelMaturidade = ?, status = ?, idRaca = ?, _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
    [merged.brinco, merged.sexo, merged.nivelMaturidade, merged.status ? 1 : 0, merged.idRaca, JSON.stringify(merged), now, id],
  );

  await enqueue('bufalos', 'UPDATE', merged);
  return merged;
};

export const deleteBufalo = async (id: string) => {
  await execute(`DELETE FROM bufalos WHERE id = ?`, [id]);
  await enqueue('bufalos', 'DELETE', { id });
  return true;
};

export const getRacas = async () => {
  const rows = await queryAll<{ _raw: string }>(`SELECT _raw FROM racas`);
  return rows.map((r) => JSON.parse(r._raw));
};

export const filtrarBufalos = async (
  propriedadeId: string,
  filtros: {
    brinco?: string;
    sexo?: string;
    nivel_maturidade?: string;
    status?: boolean;
    id_raca?: string;
  },
  page = 1,
  limit = 10,
) => {
  const conditions: string[] = [`propriedadeId = ?`, `id IS NOT NULL`];
  const params: any[] = [propriedadeId];

  if (filtros?.brinco) {
    conditions.push(`brinco LIKE ?`);
    params.push(`%${filtros.brinco}%`);
  }
  if (filtros?.sexo) {
    conditions.push(`sexo = ?`);
    params.push(filtros.sexo);
  }
  if (filtros?.nivel_maturidade) {
    conditions.push(`nivelMaturidade = ?`);
    params.push(filtros.nivel_maturidade);
  }
  if (filtros?.status !== undefined) {
    conditions.push(`status = ?`);
    params.push(filtros.status ? 1 : 0);
  }
  if (filtros?.id_raca) {
    conditions.push(`idRaca = ?`);
    params.push(filtros.id_raca);
  }

  const where = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const rows = await queryAll<any>(
    `SELECT _raw FROM bufalos WHERE ${where} ORDER BY brinco ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  const countRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM bufalos WHERE ${where}`,
    params,
  );
  const total = countRow?.total ?? 0;

  const bufalos = rows.map((r) => {
    const b = JSON.parse(r._raw);
    return { ...b, racaNome: b.raca?.nome || b.nomeRaca || 'Desconhecida' };
  });

  return {
    bufalos,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

export const getBufaloPorMicrochip = async (microchip: string) => {
  const row = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE _raw LIKE ?`,
    [`%"microchip":"${microchip}"%`],
  );
  if (!row) throw new Error(`Búfalo com microchip ${microchip} não encontrado`);
  return JSON.parse(row._raw);
};

export const getBufaloByBrincoAndSexo = async (
  propriedadeId: string,
  brinco: string,
  sexo: 'M' | 'F',
) => {
  const row = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE propriedadeId = ? AND brinco = ? AND sexo = ? LIMIT 1`,
    [propriedadeId, brinco, sexo],
  );
  return row ? JSON.parse(row._raw) : null;
};

export const getGrupos = async (idPropriedade: string): Promise<Grupo[]> => {
  return grupoService.getAllByPropriedade(idPropriedade);
};

export const moverBufaloDeGrupo = async (
  idBufalo: string,
  idNovoGrupo: string,
) => {
  const payload = {
    idsBufalos: [idBufalo],
    idNovoGrupo,
    motivo: 'Mudança manual de grupo via tela de animal',
  };
  await enqueue('bufalos', 'UPDATE', { id: idBufalo, ...payload });
};

export default {
  getGrupos,
  moverBufaloDeGrupo,
  getBufalos,
  getBufaloDetalhes,
  createBufalo,
  updateBufalo,
  deleteBufalo,
  getRacas,
  filtrarBufalos,
  getBufaloPorMicrochip,
  getBufaloByBrincoAndSexo,
};
