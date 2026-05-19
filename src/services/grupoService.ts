import { queryAll } from "../database/db";

export interface Grupo {
  id_grupo: string;
  nome_grupo: string;
  color: string;
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
        id_grupo: item.idGrupo ?? item.id,
        nome_grupo: item.nomeGrupo ?? item.nome,
        color: item.color || "#000000",
      };
    });
  },
};
