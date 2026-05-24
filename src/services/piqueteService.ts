import { queryAll, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";

export interface Piquete {
  idGrupo: string | null;
  id: string;
  nome: string;
  coords: { latitude: number; longitude: number }[];
  grupoNome: string;
  grupoCor: string;
  color: string;
  areaM2?: number;
  qtdMax?: number;
  tipoLote?: string;
  status?: string;
  descricao?: string;
  updatedAt?: string;
}

export interface NovoPiqueteDTO {
  nomeLote: string;
  idPropriedade: string;
  idGrupo: string;
  tipoLote: string;
  status: string;
  descricao?: string;
  qtd_max: number;
  area_m2: number;
  geo_mapa: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

function mapRawToPiquete(item: any): Piquete {
  const coords =
    item.geoMapa?.coordinates?.[0]?.map((c: number[]) => ({
      latitude: c[1],
      longitude: c[0],
    })) ?? [];

  return {
    id: item.idLote ?? item.id,
    nome: item.nomeLote,
    coords,
    idGrupo: item.grupo?.idGrupo ?? item.idGrupo ?? null,
    grupoNome: item.grupo?.nomeGrupo ?? "",
    grupoCor: item.grupo?.color ?? "#000000",
    color: item.grupo?.color ?? "#000000",
    areaM2: item.area_m2,
    tipoLote: item.tipoLote,
    status: item.status,
  } as Piquete;
}

export const piqueteService = {
  async getAll(id: string): Promise<Piquete[]> {
    const rows = await queryAll<{ _raw: string; updatedAt: string }>(
      `SELECT _raw, updatedAt FROM lotes WHERE propriedadeId = ? ORDER BY updatedAt DESC`,
      [id],
    );

    const grupoRows = await queryAll<{ _raw: string }>(
      `SELECT _raw FROM grupos WHERE propriedadeId = ?`,
      [id],
    );
    const grupoMap: Record<string, { nomeGrupo: string; color: string }> = {};
    grupoRows.forEach((gr) => {
      const g = JSON.parse(gr._raw);
      const key = g.idGrupo ?? g.id;
      if (key) grupoMap[key] = { nomeGrupo: g.nomeGrupo ?? g.nome ?? '', color: g.color ?? '#000000' };
    });

    return rows.map((row) => {
      const item = JSON.parse(row._raw);
      const idGrupo = item.grupo?.idGrupo ?? item.idGrupo ?? null;
      const fallback = idGrupo ? grupoMap[idGrupo] : undefined;
      return {
        id: item.idLote ?? item.id,
        nome: item.nomeLote,
        coords: item.geoMapa?.coordinates?.[0]?.map((c: number[]) => ({
          latitude: c[1], longitude: c[0],
        })) ?? [],
        idGrupo,
        grupoNome: item.grupo?.nomeGrupo ?? fallback?.nomeGrupo ?? '',
        grupoCor: item.grupo?.color ?? fallback?.color ?? '#000000',
        color: item.grupo?.color ?? fallback?.color ?? '#000000',
        areaM2: item.area_m2 ?? item.areaM2,
        qtdMax: item.qtdMax ?? item.qtd_max,
        tipoLote: item.tipoLote,
        status: item.status,
        descricao: item.descricao ?? null,
        updatedAt: row.updatedAt,
      } as Piquete;
    });
  },

  async findById(id: string): Promise<Piquete | null> {
    const row = await queryFirst<{ _raw: string }>(
      `SELECT _raw FROM lotes WHERE id = ?`,
      [id],
    );
    if (!row) return null;
    return mapRawToPiquete(JSON.parse(row._raw));
  },

  async create(novoPiquete: NovoPiqueteDTO): Promise<Piquete> {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();
    const body = {
      ...novoPiquete,
      id,
      geoMapa: {
        type: "Polygon" as const,
        coordinates: [
          [
            ...novoPiquete.geoMapa.coordinates[0],
            novoPiquete.geoMapa.coordinates[0][0],
          ],
        ],
      },
    };

    const record = {
      ...body,
      idLote: id,
      idPropriedade: novoPiquete.idPropriedade,
      grupo: { idGrupo: novoPiquete.idGrupo },
    };

    await execute(
      `INSERT INTO lotes (id, propriedadeId, idGrupo, _raw, _synced, updatedAt)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [id, novoPiquete.idPropriedade, novoPiquete.idGrupo, JSON.stringify(record), now],
    );

    await enqueue("lotes", "CREATE", body);

    return mapRawToPiquete(record);
  },

  async update(id: string, data: Partial<NovoPiqueteDTO>): Promise<void> {
    const now = new Date().toISOString();
    const row = await queryFirst<{ _raw: string }>(
      `SELECT _raw FROM lotes WHERE id = ?`,
      [id],
    );
    const merged = { ...(row ? JSON.parse(row._raw) : {}), ...data, updatedAt: now };
    await execute(
      `UPDATE lotes SET _raw = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
      [JSON.stringify(merged), now, id],
    );
    await enqueue("lotes", "UPDATE", { id, ...data });
  },

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await execute(
      `UPDATE lotes SET deletedAt = ?, _synced = 0, updatedAt = ? WHERE id = ?`,
      [now, now, id],
    );
    await enqueue("lotes", "DELETE", { id });
  },
};
