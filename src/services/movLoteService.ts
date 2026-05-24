import uuid from "react-native-uuid";
import { execute, queryFirst } from "../database/db";
import { enqueue } from "./pendingOperationsService";
import { apiFetch } from "../lib/apiClient";

export interface NovaMovimentacaoDTO {
  idPropriedade: string;
  idGrupo: string;
  idLoteAtual: string;
  idLoteAnterior?: string;
  dtEntrada: string;
}

export interface StatusGrupo {
  grupo_id: string;
  localizacao_atual: {
    id_lote: string;
    desde: string;
    dias_no_local: number;
  };
}

export interface HistoricoMovimento {
  id_movimento: string;
  id_lote_anterior: string | null;
  id_lote_atual: string;
  dt_entrada: string;
  dt_saida: string | null;
  dias_permanencia: number;
  status: "Finalizado" | "Atual";
}

export interface HistoricoGrupo {
  grupo_id: string;
  total_movimentacoes: number;
  historico: HistoricoMovimento[];
}

export const movLoteService = {
  async create(data: NovaMovimentacaoDTO): Promise<void> {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();
    const record = { ...data, id, createdAt: now, updatedAt: now };

    // Registra o movimento
    await execute(
      `INSERT INTO mov_lote (id, propriedadeId, idGrupo, idLoteAtual, dtEntrada, updatedAt, _synced, _raw)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, data.idPropriedade, data.idGrupo, data.idLoteAtual, data.dtEntrada, now, JSON.stringify(record)],
    );

    // Atualiza updatedAt do lote destino para que piqueteService.getAll (ORDER BY updatedAt DESC)
    // o reconheça imediatamente como o lote atual do grupo
    const loteRow = await queryFirst<{ _raw: string }>(
      `SELECT _raw FROM lotes WHERE id = ?`,
      [data.idLoteAtual],
    );
    if (loteRow) {
      const merged = { ...JSON.parse(loteRow._raw), updatedAt: now };
      await execute(
        `UPDATE lotes SET _raw = ?, updatedAt = ?, _synced = 0 WHERE id = ?`,
        [JSON.stringify(merged), now, data.idLoteAtual],
      );
    }

    await enqueue("mov_lote", "CREATE", record);
  },

  async findByPropriedade(
    idPropriedade: string,
    page = 1,
    limit = 20
  ): Promise<{ data: any[]; meta: any }> {
    return apiFetch(
      `/mov-lote/propriedade/${idPropriedade}?page=${page}&limit=${limit}`
    );
  },

  async findStatusAtual(idGrupo: string): Promise<StatusGrupo> {
    return apiFetch(`/mov-lote/status/grupo/${idGrupo}`);
  },

  async findHistoricoGrupo(idGrupo: string): Promise<HistoricoGrupo> {
    return apiFetch(`/mov-lote/historico/grupo/${idGrupo}`);
  },
};
