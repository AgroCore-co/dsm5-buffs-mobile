import uuid from "react-native-uuid";
import { execute, queryAll, queryFirst } from "../database/db";
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

// Normaliza string de data com espaço ("YYYY-MM-DD HH:MM:SS") → ISO ("YYYY-MM-DDTHH:MM:SS")
// para que new Date() funcione corretamente no Hermes (Android).
function normDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  return t ? t.replace(" ", "T") : null;
}

function diffDias(from: string | null, to: string | null = null): number {
  const f = normDate(from);
  if (!f) return 0;
  const start = new Date(f).getTime();
  if (isNaN(start)) return 0;
  const end = to ? new Date(normDate(to)!).getTime() : Date.now();
  if (isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

export const movLoteService = {
  // ─── ESCRITA (sempre offline-first) ──────────────────────────────────────
  async create(data: NovaMovimentacaoDTO): Promise<void> {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();
    const record = { ...data, id, createdAt: now, updatedAt: now };

    // Registra o movimento localmente
    await execute(
      `INSERT INTO mov_lote (id, propriedadeId, idGrupo, idLoteAtual, dtEntrada, updatedAt, _synced, _raw)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, data.idPropriedade, data.idGrupo, data.idLoteAtual, data.dtEntrada, now, JSON.stringify(record)],
    );

    // Bumpa updatedAt do lote destino para que grupoService.getAllByPropriedade
    // (ORDER BY updatedAt DESC) o reconheça imediatamente como o lote atual do grupo
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

  // ─── LEITURAS (network-first, fallback local) ────────────────────────────

  /**
   * Lista movimentações da propriedade com paginação.
   * Online: API → upserta registros brutos no mov_lote local (cache).
   * Offline: lê de mov_lote diretamente.
   */
  async findByPropriedade(
    idPropriedade: string,
    page = 1,
    limit = 20
  ): Promise<{ data: any[]; meta: any }> {
    try {
      const result = await apiFetch(
        `/mov-lote/propriedade/${idPropriedade}?page=${page}&limit=${limit}`
      );

      // Upserta registros no SQLite para enriquecer o cache offline
      const records: any[] = Array.isArray(result) ? result : (result?.data ?? []);
      for (const r of records) {
        const rid = r.id ?? r.id_movimento;
        if (!rid) continue;
        const updAt = r.updatedAt ?? r.updated_at ?? new Date().toISOString();
        await execute(
          `INSERT INTO mov_lote (id, propriedadeId, idGrupo, idLoteAtual, dtEntrada, updatedAt, _synced, _raw)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)
           ON CONFLICT(id) DO UPDATE SET
             _raw      = excluded._raw,
             updatedAt = excluded.updatedAt,
             _synced   = 1`,
          [
            rid,
            r.idPropriedade ?? idPropriedade,
            r.idGrupo ?? null,
            r.idLoteAtual ?? r.id_lote_atual ?? null,
            r.dtEntrada ?? r.dt_entrada ?? null,
            updAt,
            JSON.stringify(r),
          ],
        );
      }

      return result;
    } catch {
      // Fallback: paginação local
      const offset = (page - 1) * limit;
      const rows = await queryAll<{ _raw: string }>(
        `SELECT _raw FROM mov_lote
         WHERE propriedadeId = ? AND deletedAt IS NULL
         ORDER BY dtEntrada DESC
         LIMIT ? OFFSET ?`,
        [idPropriedade, limit, offset],
      );
      const countRow = await queryFirst<{ total: number }>(
        `SELECT COUNT(*) AS total FROM mov_lote WHERE propriedadeId = ? AND deletedAt IS NULL`,
        [idPropriedade],
      );
      const total = countRow?.total ?? 0;
      return {
        data: rows.map(r => JSON.parse(r._raw)),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    }
  },

  /**
   * Status atual (lote) de um grupo.
   * Online: API.
   * Offline: movimento mais recente em mov_lote; se não houver, infere do lote
   * com maior updatedAt que pertence ao grupo.
   */
  async findStatusAtual(idGrupo: string): Promise<StatusGrupo> {
    try {
      return await apiFetch(`/mov-lote/status/grupo/${idGrupo}`);
    } catch {
      // Tenta o movimento mais recente gravado localmente
      const movRow = await queryFirst<{
        idLoteAtual: string;
        dtEntrada: string;
      }>(
        `SELECT idLoteAtual, dtEntrada FROM mov_lote
         WHERE idGrupo = ? AND deletedAt IS NULL
         ORDER BY dtEntrada DESC
         LIMIT 1`,
        [idGrupo],
      );

      if (movRow) {
        const desde = movRow.dtEntrada?.slice(0, 10) ?? "";
        return {
          grupo_id: idGrupo,
          localizacao_atual: {
            id_lote: movRow.idLoteAtual,
            desde,
            dias_no_local: diffDias(desde),
          },
        };
      }

      // Sem movimentos locais: infere pelo lote mais recentemente atualizado do grupo
      const loteRow = await queryFirst<{ _raw: string }>(
        `SELECT _raw FROM lotes
         WHERE (
           json_extract(_raw, '$.grupo.idGrupo') = ?
           OR json_extract(_raw, '$.idGrupo') = ?
         )
         AND deletedAt IS NULL
         ORDER BY updatedAt DESC
         LIMIT 1`,
        [idGrupo, idGrupo],
      );

      if (loteRow) {
        const lote = JSON.parse(loteRow._raw);
        const desde = (lote.updatedAt ?? "").slice(0, 10);
        return {
          grupo_id: idGrupo,
          localizacao_atual: {
            id_lote: lote.idLote ?? lote.id ?? "",
            desde,
            dias_no_local: diffDias(desde),
          },
        };
      }

      // Sem qualquer dado local — retorna estado neutro (não lança erro)
      return {
        grupo_id: idGrupo,
        localizacao_atual: { id_lote: "", desde: "", dias_no_local: 0 },
      };
    }
  },

  /**
   * Histórico de movimentações de um grupo.
   * Online: API.
   * Offline: reconstrói a partir de mov_lote local —
   *   dt_saida  = dtEntrada do próximo registro
   *   dias_permanencia = diferença de dias calculada localmente
   *   status "Atual" para o mais recente, "Finalizado" para os demais
   */
  async findHistoricoGrupo(idGrupo: string): Promise<HistoricoGrupo> {
    try {
      return await apiFetch(`/mov-lote/historico/grupo/${idGrupo}`);
    } catch {
      const rows = await queryAll<{
        _raw: string;
        idLoteAtual: string;
        dtEntrada: string;
      }>(
        `SELECT _raw, idLoteAtual, dtEntrada FROM mov_lote
         WHERE idGrupo = ? AND deletedAt IS NULL
         ORDER BY dtEntrada ASC`,
        [idGrupo],
      );

      const historico: HistoricoMovimento[] = rows.map((row, idx) => {
        const raw = JSON.parse(row._raw);
        const isLast = idx === rows.length - 1;
        const dtEntrada = row.dtEntrada?.slice(0, 10) ?? "";
        const dtSaida = isLast
          ? null
          : rows[idx + 1].dtEntrada?.slice(0, 10) ?? null;

        return {
          id_movimento: raw.id,
          id_lote_anterior: raw.idLoteAnterior ?? null,
          id_lote_atual: row.idLoteAtual,
          dt_entrada: dtEntrada,
          dt_saida: dtSaida,
          dias_permanencia: diffDias(dtEntrada, dtSaida),
          status: isLast ? "Atual" : "Finalizado",
        };
      });

      // Inverte: mais recente primeiro (mesmo comportamento da API)
      historico.reverse();

      return {
        grupo_id: idGrupo,
        total_movimentacoes: historico.length,
        historico,
      };
    }
  },
};
