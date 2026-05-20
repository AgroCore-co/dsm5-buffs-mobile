export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface ResolvedPush {
  endpoint: string;
  method: string;
  body?: any;
}

type Resolver = (operation: OperationType, payload: any) => ResolvedPush | null;

const RESOLVERS: Record<string, Resolver> = {
  bufalos: (op, p) => {
    if (op === 'UPDATE' && p?.idNovoGrupo) {
      return {
        endpoint: '/bufalos/grupo/mover',
        method: 'PATCH',
        body: { idsBufalos: p.idsBufalos ?? [p.id], idNovoGrupo: p.idNovoGrupo, motivo: p.motivo },
      };
    }
    if (op === 'CREATE') return { endpoint: '/bufalos', method: 'POST', body: p };
    if (op === 'UPDATE') return { endpoint: `/bufalos/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/bufalos/${p.id}`, method: 'DELETE' };
    return null;
  },
  pesagens: (op, p) => {
    if (op === 'CREATE') return { endpoint: `/dados-zootecnicos/bufalo/${p.bufaloId}`, method: 'POST', body: p };
    if (op === 'UPDATE') return { endpoint: `/dados-zootecnicos/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/dados-zootecnicos/${p.id}`, method: 'DELETE' };
    return null;
  },
  eventos_sanitarios: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/dados-sanitarios', method: 'POST', body: p };
    if (op === 'UPDATE') return { endpoint: `/dados-sanitarios/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/dados-sanitarios/${p.id}`, method: 'DELETE' };
    return null;
  },
  alertas: (op, p) => {
    if (op === 'UPDATE') return { endpoint: `/alertas/${p.id}/visto`, method: 'PATCH', body: { visto: p.visto ?? true } };
    return null;
  },
};

export function resolvePushEndpoint(entity: string, operation: OperationType, payload: any): ResolvedPush {
  const resolved = RESOLVERS[entity]?.(operation, payload);
  if (resolved) return resolved;

  const base = `/${entity}`;
  const id = payload?.id ?? null;
  if (operation === 'CREATE') return { endpoint: base, method: 'POST', body: payload };
  if (operation === 'UPDATE') return { endpoint: id ? `${base}/${id}` : base, method: 'PATCH', body: payload };
  return id ? { endpoint: `${base}/${id}`, method: 'DELETE' } : { endpoint: base, method: 'DELETE' };
}
