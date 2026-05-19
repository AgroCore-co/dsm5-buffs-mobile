import { queryAll, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";

export interface Grupo {
  id: string;
  nome: string;
  color: string;
  idPropriedade?: string;
}

export interface NovoGrupoDTO {
  nomeGrupo: string;
  idPropriedade: string;
  color?: string;
}

export const grupoService = {
  async getAllByPropriedade(idPropriedade: string): Promise<Grupo[]> {
    const rows = await queryAll<{ _raw: string }>(
      `SELECT _raw FROM grupos WHERE propriedadeId = ?`,
      [idPropriedade],
    );
    return rows.map((r) => {
      const item = JSON.parse(r._raw);
      return {
        id: item.idGrupo ?? item.id,
        nome: item.nomeGrupo ?? item.nome ?? "",
        color: item.color || "#000000",
        idPropriedade: item.idPropriedade,
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
