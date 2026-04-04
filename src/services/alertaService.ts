import { apiFetch } from "../lib/apiClient";

export type Filtro = "TODOS" | "PENDENTES";

export type Alerta = {
  idAlerta: string;
  animalId: string;
  grupo: string;
  localizacao: string;
  motivo: string;
  nicho: string;
  dataAlerta: string;
  prioridade: "ALTA" | "MEDIA" | "BAIXA";
  observacao: string;
  visto: boolean;
  idEventoOrigem: string | null;
  tipoEventoOrigem: string | null;
  idPropriedade: string;
  created_at: string;
  updated_at: string;

  // 🔹 Dados agregados do búfalo (vindos do backend)
  nome_animal: string;
  brinco_animal?: string | null;
};

/**
 * Busca alertas por propriedade
 */
export const getAlertasPorPropriedade = async (
  propriedadeId: string | null,
  filtro: Filtro = "PENDENTES",
  page: number = 1,
  limit: number = 10
) => {
  try {
    const incluirVistos = filtro !== "PENDENTES";

    const result = await apiFetch(
      `/alertas/propriedade/${propriedadeId}?incluirVistos=${incluirVistos}&page=${page}&limit=${limit}`
    );

    const alertas: Alerta[] = result.data
      .map((a: any) => ({
        ...a,
        prioridade: a.prioridade?.toUpperCase(),
        nome_animal: a.bufalo?.nome ?? "Sem nome",
        brinco_animal: a.bufalo?.brinco ?? null,
      }))
      // 🔹 não vistos primeiro
      .sort((a: Alerta, b: Alerta) => Number(a.visto) - Number(b.visto));

    return {
      alertas,
      meta: result.meta,
    };
  } catch (err) {
    console.error("Erro ao buscar alertas:", err);
    return {
      alertas: [],
      meta: {
        page: 1,
        limit,
        total: 0,
        totalPages: 1,
      },
    };
  }
};

/**
 * Marca alerta como visto
 */
export const marcarAlertaVisto = async (id_alerta: string) => {
  try {
    return await apiFetch(
      `/alertas/${id_alerta}/visto?status=true`,
      { method: "PATCH" }
    );
  } catch (err) {
    console.error(
      `Erro ao marcar alerta ${id_alerta} como visto:`,
      err
    );
    throw err;
  }
};
