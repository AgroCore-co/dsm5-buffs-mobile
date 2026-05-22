export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface ResolvedPush {
  endpoint: string;
  method: string;
  body?: any;
}

type Resolver = (operation: OperationType, payload: any) => ResolvedPush | null;

function clean(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function cleanStrict(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
}

function shapeBufaloCreate(p: any) {
  return clean({
    id: p.id,
    nome: p.nome,
    brinco: p.brinco,
    microchip: p.microchip,
    dtNascimento: p.dtNascimento,
    nivelMaturidade: p.nivelMaturidade,
    sexo: p.sexo,
    idRaca: p.idRaca,
    idPropriedade: p.idPropriedade,
    idGrupo: p.idGrupo,
    idPai: p.idPai,
    idMae: p.idMae,
    status: p.status,
    categoria: p.categoria,
    origem: p.origem,
    brinco_original: p.brinco_original,
    registro_prov: p.registro_prov,
    registro_def: p.registro_def,
    id_pai_semen: p.id_pai_semen,
    id_mae_ovulo: p.id_mae_ovulo,
  });
}

function shapePesagemCreate(p: any) {
  return clean({
    id: p.id,
    peso: p.peso,
    condicaoCorporal: p.condicaoCorporal ?? p.condicao_corporal,
    corPelagem: p.corPelagem ?? p.cor_pelagem,
    formatoChifre: p.formatoChifre ?? p.formato_chifre,
    porteCorporal: p.porteCorporal ?? p.porte_corporal,
    dtRegistro: p.dtRegistro,
    tipoPesagem: p.tipoPesagem ?? p.tipo_pesagem,
  });
}

function shapeSanitarioCreate(p: any) {
  return clean({
    id: p.id,
    idBufalo: p.idBufalo ?? p.id_bufalo,
    idMedicao: p.idMedicao ?? p.id_medicao,
    dtAplicacao: p.dtAplicacao ?? p.dt_aplicacao,
    dosagem: p.dosagem,
    unidade_medida: p.unidade_medida,
    doenca: p.doenca,
    necessita_retorno: p.necessita_retorno,
    dtRetorno: p.dtRetorno,
  });
}

function shapeReproducaoCreate(p: any) {
  // Payload já vem pré-montado pelo form com os campos corretos por tipo:
  // IA/IATF → idSemen; TE → idSemen (embrião) + idDoadora (búfala origem); Monta Natural → idBufalo
  return cleanStrict({
    id: p.id,
    idPropriedade: p.idPropriedade,
    idSemen:   p.idSemen   ?? undefined,
    idDoadora: p.idDoadora ?? undefined,
    idBufalo:  p.idBufalo  ?? undefined,
    idBufala:  p.idBufala,
    tipoInseminacao: p.tipoInseminacao,
    dtEvento: p.dtEvento,
    status: p.status,
  });
}

function shapeCicloCreate(p: any) {
  return clean({
    id: p.id,
    idBufala: p.idBufala,
    idPropriedade: p.idPropriedade,
    dtParto: p.dtParto,
    padraoDias: p.padraoDias,
    dtSecagemReal: p.dtSecagemReal,
    observacao: p.observacao,
  });
}

function shapeOrdenhaCreate(p: any) {
  return clean({
    id: p.id,
    idBufala: p.idBufala,
    idPropriedade: p.idPropriedade,
    idCicloLactacao: p.idCicloLactacao,
    qtOrdenha: p.qtOrdenha,
    periodo: p.periodo,
    ocorrencia: p.ocorrencia,
    dtOrdenha: p.dtOrdenha,
  });
}

function shapeLoteCreate(p: any) {
  return clean({
    id: p.id,
    nomeLote: p.nomeLote,
    idPropriedade: p.idPropriedade,
    idGrupo: p.idGrupo,
    tipoLote: p.tipoLote,
    status: p.status,
    descricao: p.descricao,
    qtd_max: p.qtd_max ?? p.qtdMax,
    area_m2: p.area_m2 ?? p.areaMq ?? p.areaM2,
    geo_mapa: p.geo_mapa ?? (p.geoMapa ? JSON.stringify(p.geoMapa) : undefined),
  });
}

function shapeRetiradaCreate(p: any) {
  return clean({
    id: p.id,
    idIndustria: p.idIndustria,
    idPropriedade: p.idPropriedade,
    resultadoTeste: p.resultadoTeste,
    observacao: p.observacao,
    quantidade: p.quantidade,
    dtColeta: p.dtColeta,
  });
}

function shapeProducaoDiariaCreate(p: any) {
  return clean({
    id: p.id,
    idPropriedade: p.idPropriedade ?? p.id_propriedade,
    quantidade: p.quantidade,
    dtRegistro: p.dtRegistro ?? p.dt_registro,
    observacao: p.observacao,
  });
}

const RESOLVERS: Record<string, Resolver> = {
  bufalos: (op, p) => {
    if (op === 'UPDATE' && p?.idNovoGrupo) {
      return {
        endpoint: '/bufalos/grupo/mover',
        method: 'PATCH',
        body: { idsBufalos: p.idsBufalos ?? [p.id], idNovoGrupo: p.idNovoGrupo, motivo: p.motivo },
      };
    }
    if (op === 'CREATE') return { endpoint: '/bufalos', method: 'POST', body: shapeBufaloCreate(p) };
    if (op === 'UPDATE') return { endpoint: `/bufalos/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/bufalos/${p.id}`, method: 'DELETE' };
    return null;
  },
  pesagens: (op, p) => {
    if (op === 'CREATE') return { endpoint: `/dados-zootecnicos/bufalo/${p.bufaloId}`, method: 'POST', body: shapePesagemCreate(p) };
    if (op === 'UPDATE') return { endpoint: `/dados-zootecnicos/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/dados-zootecnicos/${p.id}`, method: 'DELETE' };
    return null;
  },
  eventos_sanitarios: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/dados-sanitarios', method: 'POST', body: shapeSanitarioCreate(p) };
    if (op === 'UPDATE') return { endpoint: `/dados-sanitarios/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/dados-sanitarios/${p.id}`, method: 'DELETE' };
    return null;
  },
  alertas: (op, p) => {
    if (op === 'UPDATE') return { endpoint: `/alertas/${p.id}/visto`, method: 'PATCH', body: { visto: p.visto ?? true } };
    return null;
  },
  reproducoes: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/cobertura', method: 'POST', body: shapeReproducaoCreate(p) };
    if (op === 'UPDATE') {
      const isRegistrarParto = p?.dt_parto != null || p?.criar_ciclo_lactacao != null;
      if (isRegistrarParto) {
        return {
          endpoint: `/cobertura/${p.id}/registrar-parto`,
          method: 'PATCH',
          body: {
            dt_parto: p.dt_parto,
            tipo_parto: p.tipo_parto,
            observacao: p.observacao,
            criar_ciclo_lactacao: p.criar_ciclo_lactacao,
            padrao_dias_lactacao: p.padrao_dias_lactacao,
          },
        };
      }
      return { endpoint: `/cobertura/${p.id}`, method: 'PATCH', body: { status: p.status, tipo_parto: p.tipo_parto } };
    }
    if (op === 'DELETE') return { endpoint: `/cobertura/${p.id}`, method: 'DELETE' };
    return null;
  },
  ciclos_lactacao: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/lactacao', method: 'POST', body: shapeCicloCreate(p) };
    if (op === 'UPDATE') return { endpoint: `/lactacao/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/lactacao/${p.id}`, method: 'DELETE' };
    return null;
  },
  lotes: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/lotes', method: 'POST', body: shapeLoteCreate(p) };
    if (op === 'UPDATE') return { endpoint: `/lotes/${p.id}`, method: 'PATCH', body: p };
    if (op === 'DELETE') return { endpoint: `/lotes/${p.id}`, method: 'DELETE' };
    return null;
  },
  ordenhas: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/ordenhas', method: 'POST', body: shapeOrdenhaCreate(p) };
    return null;
  },
  retiradas: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/retiradas', method: 'POST', body: shapeRetiradaCreate(p) };
    return null;
  },
  producao_diaria: (op, p) => {
    if (op === 'CREATE') return { endpoint: '/producao-diaria', method: 'POST', body: shapeProducaoDiariaCreate(p) };
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
