import { queryAll, execute } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import uuid from "react-native-uuid";

export interface Piquete {
  idGrupo: any;
  id: string;
  nome: string;
  coords: { latitude: number; longitude: number }[];
  grupoNome: string;
  grupoCor: string;
  color: string;
}

export interface NovoPiqueteDTO {
  nomeLote: string;
  idPropriedade: string;
  idGrupo: string;
  tipoLote: string;
  status: string;
  descricao?: string;
  qtdMax: number;
  areaM2: number;
  geoMapa: {
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
  } as Piquete;
}

export const piqueteService = {
  async getAll(id: string): Promise<Piquete[]> {
    const rows = await queryAll<{ _raw: string }>(
      `SELECT _raw FROM lotes WHERE propriedadeId = ?`,
      [id],
    );
    return rows.map((row) => mapRawToPiquete(JSON.parse(row._raw)));
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
};
