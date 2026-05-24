import { queryAll, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";

export interface Grupo {
  id: string;
  nome: string;
  color: string;
  idPropriedade?: string;
}

export interface GrupoEnriquecido extends Grupo {
  piquete: string;    // nomeLote do lote associado, ou "Sem piquete"
  quantidade: number; // total de búfalos no grupo
  qtdMax: number;     // capacidade máxima do lote (qtd_max)
  ocupacao: number;   // 0–100, arredondado
}

export interface NovoGrupoDTO {
  nomeGrupo: string;
  idPropriedade: string;
  color?: string;
}

export const grupoService = {
  async getAllByPropriedade(idPropriedade: string): Promise<GrupoEnriquecido[]> {
    const grupoRows = await queryAll<{ _raw: string }>(
      `SELECT _raw FROM grupos WHERE propriedadeId = ? AND deletedAt IS NULL`,
      [idPropriedade],
    );

    const loteRows = await queryAll<{ _raw: string }>(
      `SELECT _raw FROM lotes WHERE propriedadeId = ? AND deletedAt IS NULL`,
      [idPropriedade],
    );

    // mapa idGrupo → lote
    const loteByGrupo: Record<string, { nomeLote: string; qtdMax: number }> = {};
    loteRows.forEach((r) => {
      const l = JSON.parse(r._raw);
      const key = l.grupo?.idGrupo ?? l.idGrupo ?? null;
      if (key) {
        loteByGrupo[key] = {
          nomeLote: l.nomeLote ?? "Sem piquete",
          qtdMax: l.qtd_max ?? 0,
        };
      }
    });

    const bufaloRows = await queryAll<{ idGrupo: string; total: number }>(
      `SELECT json_extract(_raw, '$.idGrupo') AS idGrupo, COUNT(*) AS total
       FROM bufalos
       WHERE propriedadeId = ? AND deletedAt IS NULL
       GROUP BY json_extract(_raw, '$.idGrupo')`,
      [idPropriedade],
    );

    // mapa idGrupo → contagem
    const bufalosByGrupo: Record<string, number> = {};
    bufaloRows.forEach((r) => {
      if (r.idGrupo) bufalosByGrupo[r.idGrupo] = r.total;
    });

    return grupoRows.map((r) => {
      const item = JSON.parse(r._raw);
      const id = item.idGrupo ?? item.id;

      const lote = loteByGrupo[id];
      const quantidade = bufalosByGrupo[id] ?? 0;
      const qtdMax = lote?.qtdMax ?? 0;
      const ocupacaoRaw = qtdMax > 0 ? (quantidade / qtdMax) * 100 : 0;
      const ocupacao = Math.min(100, Math.round(ocupacaoRaw));

      return {
        id,
        nome: item.nomeGrupo ?? item.nome ?? "",
        color: item.color || "#000000",
        idPropriedade: item.idPropriedade,
        piquete: lote?.nomeLote ?? "Sem piquete",
        quantidade,
        qtdMax,
        ocupacao,
      };
    });
  },

  async create(data: NovoGrupoDTO): Promise<Grupo> {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();
    const record = {
      idGrupo: id,
      nomeGrupo: data.nomeGrupo,
      idPropriedade: data.idPropriedade,
      color: data.color ?? "#000000",
    };

    await execute(
      `INSERT INTO grupos (id, propriedadeId, nome, updatedAt, _synced, _raw)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [id, data.idPropriedade, data.nomeGrupo, now, JSON.stringify(record)],
    );

    await enqueue("grupos", "CREATE", { id, ...data });

    return {
      id,
      nome: data.nomeGrupo,
      color: data.color ?? "#000000",
      idPropriedade: data.idPropriedade,
    };
  },

  async update(id: string, data: Partial<NovoGrupoDTO>): Promise<void> {
    const now = new Date().toISOString();
    const row = await queryAll<{ _raw: string }>(
      `SELECT _raw FROM grupos WHERE id = ?`,
      [id],
    );
    const current = row[0] ? JSON.parse(row[0]._raw) : {};
    const merged = { ...current, ...data, updatedAt: now };
    await execute(
      `UPDATE grupos SET nome = COALESCE(?, nome), updatedAt = ?, _synced = 0, _raw = ? WHERE id = ?`,
      [data.nomeGrupo ?? null, now, JSON.stringify(merged), id],
    );
    await enqueue("grupos", "UPDATE", { id, ...data });
  },

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await execute(
      `UPDATE grupos SET deletedAt = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
      [now, now, id],
    );
    await enqueue("grupos", "DELETE", { id });
  },
};
