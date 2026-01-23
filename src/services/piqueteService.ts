import { apiFetch } from "../lib/apiClient";

export interface Piquete {
  id: string;
  nome: string;
  coords: { latitude: number; longitude: number }[];
  grupoNome: string;
  grupoCor: string;
  color: string;
}

export interface NovoPiqueteDTO {
  nome_lote: string;
  id_propriedade: string;
  id_grupo: string;
  tipo_lote: string; 
  status: string;   
  descricao?: string;
  qtd_max: number;
  area_m2: number;
  geo_mapa: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export const piqueteService = {
  async getAll(id: string): Promise<Piquete[]> {
    const response = await apiFetch(`/lotes/propriedade/${id}`);

    return response.map((item: any) => {
      const coords =
        item.geo_mapa?.coordinates?.[0]?.map((c: number[]) => ({
          latitude: c[1],
          longitude: c[0],
        })) ?? [];

      return {
        id: item.id_lote,
        nome: item.nome_lote,
        coords,
        grupoNome: item.grupo?.nome_grupo ?? "",
        grupoCor: item.grupo?.color ?? "#000000", // fallback para preto
      } as Piquete;
    });
  },
  async create(novoPiquete: NovoPiqueteDTO): Promise<Piquete> {
      const body = {
        ...novoPiquete,
        geo_mapa: {
          type: "Polygon",
          coordinates: [
            [
              ...novoPiquete.geo_mapa.coordinates[0],
              novoPiquete.geo_mapa.coordinates[0][0],
            ],
          ],
        },
      };

      const response = await apiFetch("/lotes", {
        method: "POST",
        body,
      });

      const coords =
        response.geo_mapa?.coordinates?.[0]?.map((c: number[]) => ({
          latitude: c[1],
          longitude: c[0],
        })) ?? [];

      return {
        id: response.id_lote,
        nome: response.nome_lote,
        coords,
        grupoNome: response.grupo?.nome_grupo ?? "",
        grupoCor: response.grupo?.color ?? "#000000",
        color: response.grupo?.color ?? "#000000",
      } as Piquete;
  },
};
