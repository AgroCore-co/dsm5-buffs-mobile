import uuid from 'react-native-uuid';
import { queryAll, queryFirst, execute } from '../database/db';
import { enqueue } from './pendingOperationsService';
import { grupoService, Grupo } from './grupoService';
import { normalizePayload } from '../utils/normalizePayload';

const BUFALO_FIELD_MAP: Record<string, string[]> = {
  nivelMaturidade: ['nivel_maturidade'],
  idRaca:          ['id_raca'],
  idPai:           ['id_pai'],
  idMae:           ['id_mae'],
  idPropriedade:   ['id_propriedade'],
  dtNascimento:    ['dt_nascimento'],
};

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

  const racaRows = await queryAll<{ id: string; _raw: string }>(`SELECT id, _raw FROM racas`);
  const racaMap: Record<string, string> = {};
  racaRows.forEach((r) => {
    const raca = JSON.parse(r._raw);
    racaMap[r.id] = raca.nome ?? '';
  });

  const bufalos = rows.map((r) => {
    const b = JSON.parse(r._raw);
    const racaNome = b.raca?.nome || b.nomeRaca || racaMap[b.idRaca] || 'Desconhecida';
    return { ...b, idBufalo: b.idBufalo ?? b.id, racaNome };
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

const lookupBrinco = async (animalId: string | null | undefined): Promise<string | null> => {
  if (!animalId) return null;
  const row = await queryFirst<{ _raw: string }>(`SELECT _raw FROM bufalos WHERE id = ?`, [animalId]);
  if (!row) return null;
  return JSON.parse(row._raw)?.brinco ?? null;
};

export const getBufaloDetalhes = async (id: string) => {
  const row = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE id = ?`,
    [id],
  );
  if (!row) throw new Error(`Búfalo ${id} não encontrado`);

  const bufalo = JSON.parse(row._raw);

  const paiNome =
    bufalo.brincoPai ??
    bufalo.materialGeneticoMachoNome ??
    (await lookupBrinco(bufalo.idPai)) ??
    'Desconhecido';

  const maeNome =
    bufalo.brincoMae ??
    bufalo.materialGeneticoFemeaNome ??
    (await lookupBrinco(bufalo.idMae)) ??
    'Desconhecida';

  let racaNome = bufalo.nomeRaca || bufalo.raca?.nome;
  if (!racaNome && bufalo.idRaca) {
    const racaRow = await queryFirst<{ _raw: string }>(`SELECT _raw FROM racas WHERE id = ?`, [bufalo.idRaca]);
    if (racaRow) racaNome = JSON.parse(racaRow._raw)?.nome ?? null;
  }

  return {
    ...bufalo,
    idBufalo: bufalo.idBufalo ?? bufalo.id,
    racaNome: racaNome || 'Desconhecida',
    paiNome,
    maeNome,
  };
};

export const createBufalo = async (data: any) => {
  const id = data.id ?? (uuid.v4() as string);
  const now = new Date().toISOString();

  // Normaliza: form envia snake_case, service e API esperam camelCase
  const propriedadeId   = data.propriedadeId   ?? data.id_propriedade   ?? null;
  const nivelMaturidade = data.nivelMaturidade  ?? data.nivel_maturidade ?? null;
  const idRaca          = data.idRaca           ?? data.id_raca          ?? null;
  const idPai           = data.idPai            ?? data.id_pai           ?? null;
  const idMae           = data.idMae            ?? data.id_mae           ?? null;
  const dtNascimento    = data.dtNascimento      ?? data.dt_nascimento    ?? null;

  const newRecord = {
    ...data,
    id,
    propriedadeId,
    idPropriedade: propriedadeId, // shapeBufaloCreate usa p.idPropriedade
    nivelMaturidade,
    idRaca,
    idPai,
    idMae,
    dtNascimento,
    createdAt: now,
    updatedAt: now,
  };

  await execute(
    `INSERT INTO bufalos (id, propriedadeId, brinco, sexo, nivelMaturidade, status, idRaca, _raw, _synced, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, propriedadeId, data.brinco, data.sexo, nivelMaturidade, data.status ? 1 : 0, idRaca, JSON.stringify(newRecord), now],
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

  const normalized = normalizePayload(data, BUFALO_FIELD_MAP);
  const now = new Date().toISOString();
  const merged = { ...JSON.parse(existing._raw), ...normalized, updatedAt: now };

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

export const getBufalosDoGrupo = async (
  idPropriedade: string,
  idGrupo: string,
  page = 1,
  limit = 20,
): Promise<{ bufalos: any[]; meta: { total: number; totalPages: number } }> => {
  const offset = (page - 1) * limit;
  const rows = await queryAll<any>(
    `SELECT _raw FROM bufalos
     WHERE propriedadeId = ?
       AND json_extract(_raw, '$.idGrupo') = ?
       AND (_raw NOT LIKE '%"deletedAt":%' OR _raw LIKE '%"deletedAt":null%')
     ORDER BY brinco ASC
     LIMIT ? OFFSET ?`,
    [idPropriedade, idGrupo, limit, offset],
  );
  const countRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM bufalos
     WHERE propriedadeId = ?
       AND json_extract(_raw, '$.idGrupo') = ?
       AND (_raw NOT LIKE '%"deletedAt":%' OR _raw LIKE '%"deletedAt":null%')`,
    [idPropriedade, idGrupo],
  );
  const total = countRow?.total ?? 0;
  const bufalos = rows.map((r) => {
    const b = JSON.parse(r._raw);
    return {
      ...b,
      idBufalo: b.idBufalo ?? b.id,
      racaNome: b.raca?.nome || b.nomeRaca || 'Desconhecida',
    };
  });
  return {
    bufalos,
    meta: {
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getBufaloPorMicrochip = async (microchip: string) => {
  // Usa a coluna indexada em vez de LIKE on _raw (mais seguro e eficiente)
  const row = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE microchip = ? AND deletedAt IS NULL LIMIT 1`,
    [microchip],
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
  if (!row) return null;
  const item = JSON.parse(row._raw);
  return { ...item, idBufalo: item.idBufalo ?? item.id };
};

export const getGrupos = async (idPropriedade: string): Promise<Grupo[]> => {
  return grupoService.getAllByPropriedade(idPropriedade);
};

export const moverBufaloDeGrupo = async (
  idBufalo: string,
  idNovoGrupo: string,
) => {
  const now = new Date().toISOString();

  // Atualiza localmente no SQLite antes de enfileirar
  const existing = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE id = ?`,
    [idBufalo],
  );
  if (existing) {
    const merged = { ...JSON.parse(existing._raw), idGrupo: idNovoGrupo, updatedAt: now };
    await execute(
      `UPDATE bufalos SET _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
      [JSON.stringify(merged), now, idBufalo],
    );
  }

  // Enfileira para sync com a API
  await enqueue('bufalos', 'UPDATE', {
    id: idBufalo,
    idsBufalos: [idBufalo],
    idNovoGrupo,
    motivo: 'Mudança manual de grupo via tela de animal',
  });
};

export const getBufaloById = async (
  uuid: string,
): Promise<{ brinco: string; nome: string } | null> => {
  const row = await queryFirst<{ _raw: string }>(
    `SELECT _raw FROM bufalos WHERE id = ?`,
    [uuid],
  );
  if (!row) return null;
  const b = JSON.parse(row._raw);
  return { brinco: b.brinco ?? '-', nome: b.nome ?? 'Não informado' };
};

export default {
  getGrupos,
  getBufaloById,
  moverBufaloDeGrupo,
  getBufalos,
  getBufaloDetalhes,
  getBufalosDoGrupo,
  createBufalo,
  updateBufalo,
  deleteBufalo,
  getRacas,
  filtrarBufalos,
  getBufaloPorMicrochip,
  getBufaloByBrincoAndSexo,
};
