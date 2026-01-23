import { apiFetch } from "../lib/apiClient";
import { grupoService, Grupo } from "./grupoService"; // Importe o seu grupoService

export const getBufalos = async (propriedadeId: number, page = 1, limit = 10) => {
  try {
    const result = await apiFetch(`/bufalos/propriedade/${propriedadeId}?page=${page}&limit=${limit}`);

    const bufalos = result.data.map((b: any) => ({
      ...b,
      racaNome: b.raca?.nome || "Desconhecida",
    }));

    return {
      bufalos,
      meta: result.meta, // info de paginação
    };
  } catch (error: any) {
    console.error("Erro ao buscar búfalos:", error);
    return {
      bufalos: [],
      meta: { page: 1, limit, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    };
  }
};

export const getBufaloDetalhes = async (id: string) => {
  try {
    const bufalo = await apiFetch(`/bufalos/${id}`);
    const racas = await apiFetch("/racas");
    const mapRacas: Record<number, string> = {};
    racas.forEach((r: any) => (mapRacas[r.id_raca] = r.nome));

    // Função auxiliar para pegar nome do pai/mãe
    const getParentescoNome = async (id_parent: number, tipo: 'pai' | 'mae') => {
      if (!id_parent) return "Desconhecido";
      const registro = await apiFetch(`/bufalos/${id_parent}`).catch(async () => {
        // Se não for bufalo, tenta no material-genetico
        const matGen = await apiFetch(`/material-genetico/${id_parent}`);
        return { brinco: matGen.nome || "Desconhecido" };
      });
      return registro.brinco || "Desconhecido";
    };

    const paiNome = await getParentescoNome(bufalo.id_pai, 'pai');
    const maeNome = await getParentescoNome(bufalo.id_mae, 'mae');

    return {
      ...bufalo,
      racaNome: mapRacas[bufalo.id_raca] || "Desconhecida",
      paiNome,
      maeNome,
    };
  } catch (err) {
    console.error("Erro ao buscar detalhes do búfalo:", err);
    throw err;
  }
};

export const createBufalo = async (data: any) => {
  try {
    const bufalo = await apiFetch("/bufalos", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return bufalo;
  } catch (err) {
    console.error("Erro ao criar búfalo:", err);
    throw err;
  }
};

export const updateBufalo = async (id: number, data: any) => {
  try {
    const bufalo = await apiFetch(`/bufalos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
    return bufalo;
  } catch (err) {
    console.error(`Erro ao atualizar búfalo ${id}:`, err);
    throw err;
  }
};

export const deleteBufalo = async (id: number) => {
  try {
    await apiFetch(`/bufalos/${id}`, {
      method: "DELETE",
    });
    return true;
  } catch (err) {
    console.error(`Erro ao deletar búfalo ${id}:`, err);
    throw err;
  }
};


export const getRacas = async () => {
  try {
    const racas = await apiFetch("/racas");
    return racas; 
  } catch (err) {
    console.error("Erro ao buscar raças:", err);
    throw err;
  }
};

export const filtrarBufalos = async (
  propriedadeId: number,
  filtros: {
    brinco?: string;
    sexo?: string;
    nivel_maturidade?: string;
    status?: boolean;
    id_raca?: string;
  },
  page = 1,
  limit = 10
) => {
  try {
    const params = new URLSearchParams();

    if (filtros?.brinco) params.append("brinco", filtros.brinco);
    if (filtros?.sexo) params.append("sexo", filtros.sexo);
    if (filtros?.nivel_maturidade) params.append("nivel_maturidade", filtros.nivel_maturidade);
    if (filtros?.status !== undefined) params.append("status", String(filtros.status));
    if (filtros?.id_raca) params.append("id_raca", filtros.id_raca);

    params.append("page", String(page));
    params.append("limit", String(limit));

    const result = await apiFetch(
      `/bufalos/filtro/propriedade/${propriedadeId}/avancado?${params.toString()}`
    );
    const bufalos = result.data.map((b: any) => ({
      ...b,
      racaNome: b.raca?.nome || "Desconhecida",
    }));

    return { bufalos, meta: result.meta };
  } catch (error) {
    console.error("Erro ao filtrar búfalos:", error);
    return { bufalos: [], meta: { page: 1, totalPages: 1 } };
  }
};

export const getBufaloPorMicrochip = async (microchip: string) => {
  try {
    const bufalo = await apiFetch(`/bufalos/microchip/${microchip}`);
    return bufalo;
  } catch (err) {
    console.error(`Erro ao buscar búfalo pelo microchip ${microchip}:`, err);
    throw err;
  }
};

export const getBufaloByBrincoAndSexo = async (
  propriedadeId: number,
  brinco: string,
  sexo: "M" | "F"
) => {
  try {
    const params = new URLSearchParams();
    params.append("brinco", brinco);
    params.append("sexo", sexo);
    params.append("limit", "1");
    params.append("page", "1");

    const result = await apiFetch(
      `/bufalos/filtro/propriedade/${propriedadeId}/avancado?${params.toString()}`
    );
    const dataList = result.data || result.bufalos || result;
    return dataList && dataList.length > 0 ? dataList[0] : null;
  } catch (error) {
    console.error(`Erro ao buscar búfalo (Brinco: ${brinco}, Sexo: ${sexo}):`, error);
    return null; 
  }
};

export const getGrupos = async (idPropriedade: number): Promise<Grupo[]> => {
    return grupoService.getAllByPropriedade(idPropriedade);
}

// Nova função para mover o búfalo de grupo
export const moverBufaloDeGrupo = async (idBufalo: string, idNovoGrupo: string) => {

    const payload = {
        ids_bufalos: [idBufalo],
        id_novo_grupo: idNovoGrupo,
        motivo: "Mudança manual de grupo via tela de animal",
    };

    // Rota: /bufalos/grupo/mover (método PATCH)
    await apiFetch("/bufalos/grupo/mover", {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: {
            "Content-Type": "application/json",
        },
    });
}

export default { getGrupos, moverBufaloDeGrupo, getBufalos, getBufaloDetalhes, createBufalo, updateBufalo, deleteBufalo, getRacas, filtrarBufalos, getBufaloPorMicrochip, getBufaloByBrincoAndSexo };
