import { apiFetch } from "../lib/apiClient";

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

export const piqueteService = {
  async getAll(id: string): Promise<Piquete[]> {
    const response = await apiFetch(`/lotes/propriedade/${id}`);

    return response.map((item: any) => {
      const coords =
        item.geoMapa?.coordinates?.[0]?.map((c: number[]) => ({
          latitude: c[1],
          longitude: c[0],
        })) ?? [];

      return {
        id: item.idLote,
        nome: item.nomeLote,
        coords,
        idGrupo: item.grupo?.idGrupo ?? null,
        grupoNome: item.grupo?.nomeGrupo ?? "",
        grupoCor: item.grupo?.color ?? "#000000", // fallback para preto
      } as Piquete;
    });
  },
  async create(novoPiquete: NovoPiqueteDTO): Promise<Piquete> {
      const body = {
        ...novoPiquete,
        geoMapa: {
          type: "Polygon",
          coordinates: [
            [
              ...novoPiquete.geoMapa.coordinates[0],
              novoPiquete.geoMapa.coordinates[0][0],
            ],
          ],
        },
      };

      const response = await apiFetch("/lotes", {
        method: "POST",
        body,
      });

      const coords =
        response.geoMapa?.coordinates?.[0]?.map((c: number[]) => ({
          latitude: c[1],
          longitude: c[0],
        })) ?? [];

      return {
        id: response.idLote,
        nome: response.nomeLote,
        coords,
        grupoNome: response.grupo?.nomeGrupo ?? "",
        grupoCor: response.grupo?.color ?? "#000000",
        color: response.grupo?.color ?? "#000000",
      } as Piquete;
  },
};
