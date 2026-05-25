import { useState, useEffect, useCallback } from "react";
import { piqueteService, Piquete } from "../services/piqueteService";

export type FiltroLote = "Todos" | "Ocupados" | "Vazios" | "Descanso";

export function useLotes(propriedadeId: string | null) {
  const [lotes, setLotes] = useState<Piquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<FiltroLote>("Todos");

  const fetch = useCallback(async () => {
    if (!propriedadeId) return;
    try {
      const data = await piqueteService.getAll(propriedadeId);
      setLotes(data);
    } catch (err) {
      console.error("useLotes: erro ao buscar lotes", err);
    } finally {
      setLoading(false);
    }
  }, [propriedadeId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  const lotesFiltrados = lotes.filter((l) => {
    if (filtro === "Todos") return true;
    if (filtro === "Ocupados") return !!l.idGrupo;
    if (filtro === "Vazios") return !l.idGrupo;
    if (filtro === "Descanso") return l.status === "descanso";
    return true;
  });

  return { lotes: lotesFiltrados, loading, refreshing, refresh, filtro, setFiltro };
}
