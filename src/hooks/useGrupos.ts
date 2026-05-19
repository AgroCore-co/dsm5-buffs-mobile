import { useState, useEffect, useCallback } from "react";
import { grupoService, Grupo } from "../services/grupoService";

export function useGrupos(propriedadeId: string | null) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!propriedadeId) return;
    try {
      const data = await grupoService.getAllByPropriedade(propriedadeId);
      setGrupos(data);
    } catch (err) {
      console.error("useGrupos: erro ao buscar grupos", err);
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

  return { grupos, loading, refreshing, refresh };
}
