import { resolvePushEndpoint } from '../pushEndpoints';

describe('pushEndpoints — bufalos', () => {
  test('CREATE → POST /bufalos com payload', () => {
    const p = { id: 'b1', brinco: 'A001' };
    expect(resolvePushEndpoint('bufalos', 'CREATE', p)).toEqual({
      endpoint: '/bufalos', method: 'POST', body: p,
    });
  });

  test('UPDATE normal → PATCH /bufalos/{id}', () => {
    const p = { id: 'b1', brinco: 'A002' };
    expect(resolvePushEndpoint('bufalos', 'UPDATE', p)).toEqual({
      endpoint: '/bufalos/b1', method: 'PATCH', body: p,
    });
  });

  test('UPDATE com idNovoGrupo → PATCH /bufalos/grupo/mover com body específico', () => {
    const p = { id: 'b1', idsBufalos: ['b1'], idNovoGrupo: 'g2', motivo: 'manual' };
    expect(resolvePushEndpoint('bufalos', 'UPDATE', p)).toEqual({
      endpoint: '/bufalos/grupo/mover',
      method: 'PATCH',
      body: { idsBufalos: ['b1'], idNovoGrupo: 'g2', motivo: 'manual' },
    });
  });

  test('DELETE → DELETE /bufalos/{id} sem body', () => {
    expect(resolvePushEndpoint('bufalos', 'DELETE', { id: 'b1' })).toEqual({
      endpoint: '/bufalos/b1', method: 'DELETE',
    });
  });
});

describe('pushEndpoints — pesagens', () => {
  test('CREATE → POST /dados-zootecnicos/bufalo/{bufaloId} com body sem bufaloId', () => {
    const p = { id: 'z1', bufaloId: 'b9', peso: 480, condicaoCorporal: 3.0, tipoPesagem: 'Mensal' };
    const result = resolvePushEndpoint('pesagens', 'CREATE', p);
    expect(result.endpoint).toBe('/dados-zootecnicos/bufalo/b9');
    expect(result.method).toBe('POST');
    expect(result.body).not.toHaveProperty('bufaloId');
    expect(result.body).toHaveProperty('peso', 480);
    expect(result.body).toHaveProperty('id', 'z1');
  });

  test('UPDATE → PATCH /dados-zootecnicos/{id}', () => {
    const p = { id: 'z1', peso: 490 };
    expect(resolvePushEndpoint('pesagens', 'UPDATE', p)).toEqual({
      endpoint: '/dados-zootecnicos/z1', method: 'PATCH', body: p,
    });
  });

  test('DELETE → DELETE /dados-zootecnicos/{id}', () => {
    expect(resolvePushEndpoint('pesagens', 'DELETE', { id: 'z1' })).toEqual({
      endpoint: '/dados-zootecnicos/z1', method: 'DELETE',
    });
  });
});

describe('pushEndpoints — eventos_sanitarios', () => {
  test('CREATE → POST /dados-sanitarios', () => {
    const p = { id: 's1', idBufalo: 'b9', idMedicao: 'm1', dtAplicacao: '2026-01-01', dosagem: 10, unidade_medida: 'mL' };
    const result = resolvePushEndpoint('eventos_sanitarios', 'CREATE', p);
    expect(result.endpoint).toBe('/dados-sanitarios');
    expect(result.method).toBe('POST');
    expect(result.body).toHaveProperty('idBufalo', 'b9');
  });

  test('UPDATE → PATCH /dados-sanitarios/{id}', () => {
    const p = { id: 's1', doenca: 'Mastite' };
    expect(resolvePushEndpoint('eventos_sanitarios', 'UPDATE', p)).toEqual({
      endpoint: '/dados-sanitarios/s1', method: 'PATCH', body: p,
    });
  });

  test('DELETE → DELETE /dados-sanitarios/{id}', () => {
    expect(resolvePushEndpoint('eventos_sanitarios', 'DELETE', { id: 's1' })).toEqual({
      endpoint: '/dados-sanitarios/s1', method: 'DELETE',
    });
  });
});

describe('pushEndpoints — alertas', () => {
  test('UPDATE → PATCH /alertas/{id}/visto com body { visto }', () => {
    expect(resolvePushEndpoint('alertas', 'UPDATE', { id: 'a1', visto: true })).toEqual({
      endpoint: '/alertas/a1/visto', method: 'PATCH', body: { visto: true },
    });
  });
});

describe('pushEndpoints — reproducoes', () => {
  test('CREATE → POST /cobertura com body limpo', () => {
    const p = { id: 'r1', idBufala: 'b1', idPropriedade: 'p1', tipoInseminacao: 'IA', dtEvento: '2026-01-01' };
    const result = resolvePushEndpoint('reproducoes', 'CREATE', p);
    expect(result.endpoint).toBe('/cobertura');
    expect(result.method).toBe('POST');
    expect(result.body).toHaveProperty('id', 'r1');
    expect(result.body).toHaveProperty('idBufala', 'b1');
  });

  test('UPDATE plain → PATCH /cobertura/{id} com { status, tipo_parto }', () => {
    const p = { id: 'r1', status: 'Confirmada', tipo_parto: undefined };
    expect(resolvePushEndpoint('reproducoes', 'UPDATE', p)).toEqual({
      endpoint: '/cobertura/r1', method: 'PATCH', body: { status: 'Confirmada', tipo_parto: undefined },
    });
  });

  test('UPDATE com dt_parto → PATCH /cobertura/{id}/registrar-parto', () => {
    const p = {
      id: 'r1', status: 'CONCLUIDA',
      dt_parto: '2026-05-01', tipo_parto: 'Normal',
      observacao: 'ok', criar_ciclo_lactacao: true, padrao_dias_lactacao: 305,
    };
    expect(resolvePushEndpoint('reproducoes', 'UPDATE', p)).toEqual({
      endpoint: '/cobertura/r1/registrar-parto',
      method: 'PATCH',
      body: {
        dt_parto: '2026-05-01', tipo_parto: 'Normal',
        observacao: 'ok', criar_ciclo_lactacao: true, padrao_dias_lactacao: 305,
      },
    });
  });

  test('DELETE → DELETE /cobertura/{id}', () => {
    expect(resolvePushEndpoint('reproducoes', 'DELETE', { id: 'r1' })).toEqual({
      endpoint: '/cobertura/r1', method: 'DELETE',
    });
  });
});

describe('pushEndpoints — ciclos_lactacao', () => {
  test('CREATE → POST /lactacao com body limpo', () => {
    const p = { id: 'c1', idBufala: 'b1', idPropriedade: 'p1', dtParto: '2026-01-10', padraoDias: 305 };
    const result = resolvePushEndpoint('ciclos_lactacao', 'CREATE', p);
    expect(result.endpoint).toBe('/lactacao');
    expect(result.method).toBe('POST');
    expect(result.body).toHaveProperty('id', 'c1');
    expect(result.body).toHaveProperty('dtParto', '2026-01-10');
  });

  test('UPDATE → PATCH /lactacao/{id}', () => {
    const p = { id: 'c1', status: 'seco' };
    expect(resolvePushEndpoint('ciclos_lactacao', 'UPDATE', p)).toEqual({
      endpoint: '/lactacao/c1', method: 'PATCH', body: p,
    });
  });

  test('DELETE → DELETE /lactacao/{id}', () => {
    expect(resolvePushEndpoint('ciclos_lactacao', 'DELETE', { id: 'c1' })).toEqual({
      endpoint: '/lactacao/c1', method: 'DELETE',
    });
  });
});

describe('pushEndpoints — lotes', () => {
  test('CREATE → POST /lotes', () => {
    const p = { id: 'l1', nomeLote: 'Pasto 1', idPropriedade: 'p1' };
    expect(resolvePushEndpoint('lotes', 'CREATE', p)).toEqual({
      endpoint: '/lotes', method: 'POST', body: p,
    });
  });
});

describe('pushEndpoints — ordenhas', () => {
  test('CREATE → POST /ordenhas', () => {
    const p = { id: 'o1', idBufala: 'b1', idPropriedade: 'p1', idCicloLactacao: 'cl1', qtOrdenha: 8.5, dtOrdenha: '2026-01-01' };
    expect(resolvePushEndpoint('ordenhas', 'CREATE', p)).toEqual({
      endpoint: '/ordenhas', method: 'POST', body: p,
    });
  });
});

describe('body-limpo — CREATE envia só campos do DTO', () => {
  test('bufalos CREATE — strip de createdAt e updatedAt do body', () => {
    const p = { id: 'b1', nome: 'Valente', sexo: 'F', idPropriedade: 'p1', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    const { body } = resolvePushEndpoint('bufalos', 'CREATE', p);
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('updatedAt');
    expect(body).toHaveProperty('id', 'b1');
    expect(body).toHaveProperty('nome', 'Valente');
    expect(body).toHaveProperty('sexo', 'F');
    expect(body).toHaveProperty('idPropriedade', 'p1');
  });

  test('pesagens CREATE — converte snake_case para camelCase e strip bufaloId/createdAt/updatedAt', () => {
    const p = {
      id: 'z1',
      bufaloId: 'b1',
      peso: 480,
      condicao_corporal: 3.5,
      tipo_pesagem: 'Pesagem mensal',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    const { body } = resolvePushEndpoint('pesagens', 'CREATE', p);
    expect(body).not.toHaveProperty('bufaloId');
    expect(body).not.toHaveProperty('condicao_corporal');
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('updatedAt');
    expect(body).toHaveProperty('id', 'z1');
    expect(body).toHaveProperty('peso', 480);
    expect(body).toHaveProperty('condicaoCorporal', 3.5);
    expect(body).toHaveProperty('tipoPesagem', 'Pesagem mensal');
  });

  test('pesagens CREATE — aceita campos já em camelCase da API', () => {
    const p = { id: 'z2', bufaloId: 'b1', peso: 500, condicaoCorporal: 4.0, tipoPesagem: 'Inicial' };
    const { body } = resolvePushEndpoint('pesagens', 'CREATE', p);
    expect(body).toHaveProperty('condicaoCorporal', 4.0);
    expect(body).toHaveProperty('tipoPesagem', 'Inicial');
    expect(body).not.toHaveProperty('bufaloId');
  });

  test('eventos_sanitarios CREATE — renomeia id_bufalo→idBufalo, id_medicao→idMedicao, dt_aplicacao→dtAplicacao', () => {
    const p = {
      id: 's1',
      id_bufalo: 'b1',
      id_medicao: 'm1',
      dt_aplicacao: '2026-01-01',
      dosagem: 15,
      unidade_medida: 'mL',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    const { body } = resolvePushEndpoint('eventos_sanitarios', 'CREATE', p);
    expect(body).not.toHaveProperty('id_bufalo');
    expect(body).not.toHaveProperty('id_medicao');
    expect(body).not.toHaveProperty('dt_aplicacao');
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('updatedAt');
    expect(body).toHaveProperty('id', 's1');
    expect(body).toHaveProperty('idBufalo', 'b1');
    expect(body).toHaveProperty('idMedicao', 'm1');
    expect(body).toHaveProperty('dtAplicacao', '2026-01-01');
    expect(body).toHaveProperty('dosagem', 15);
    expect(body).toHaveProperty('unidade_medida', 'mL');
  });

  test('reproducoes CREATE — strip de createdAt e updatedAt', () => {
    const p = {
      id: 'r1',
      idBufala: 'b1',
      idPropriedade: 'p1',
      tipoInseminacao: 'IA',
      dtEvento: '2026-01-01',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    const { body } = resolvePushEndpoint('reproducoes', 'CREATE', p);
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('updatedAt');
    expect(body).toHaveProperty('id', 'r1');
    expect(body).toHaveProperty('idBufala', 'b1');
    expect(body).toHaveProperty('tipoInseminacao', 'IA');
  });

  test('ciclos_lactacao CREATE — strip de createdAt', () => {
    const p = { id: 'c1', idBufala: 'b1', idPropriedade: 'p1', dtParto: '2026-01-01', padraoDias: 305, createdAt: '2026-01-01' };
    const { body } = resolvePushEndpoint('ciclos_lactacao', 'CREATE', p);
    expect(body).not.toHaveProperty('createdAt');
    expect(body).toHaveProperty('id', 'c1');
    expect(body).toHaveProperty('dtParto', '2026-01-01');
    expect(body).toHaveProperty('padraoDias', 305);
  });

  test('ordenhas CREATE — body já limpo permanece inalterado', () => {
    const p = {
      id: 'o1',
      idBufala: 'b1',
      idPropriedade: 'p1',
      idCicloLactacao: 'cl1',
      qtOrdenha: 8.5,
      dtOrdenha: '2026-01-01T06:00:00.000Z',
    };
    const { body } = resolvePushEndpoint('ordenhas', 'CREATE', p);
    expect(body).toEqual(p);
  });

  test('lotes CREATE — converte geoMapa (objeto) para geo_mapa (string JSON)', () => {
    const geo = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] };
    const p = { id: 'l1', nomeLote: 'Pasto 1', idPropriedade: 'p1', geoMapa: geo };
    const { body } = resolvePushEndpoint('lotes', 'CREATE', p);
    expect(body).not.toHaveProperty('geoMapa');
    expect(body).toHaveProperty('geo_mapa', JSON.stringify(geo));
    expect(body).toHaveProperty('id', 'l1');
    expect(body).toHaveProperty('nomeLote', 'Pasto 1');
  });
});

describe('pushEndpoints — fallback genérico', () => {
  test('entidade sem resolver: CREATE → POST /{entity}', () => {
    const p = { id: 'x1' };
    expect(resolvePushEndpoint('grupos', 'CREATE', p)).toEqual({
      endpoint: '/grupos', method: 'POST', body: p,
    });
  });

  test('entidade sem resolver: UPDATE com id → PATCH /{entity}/{id}', () => {
    const p = { id: 'x1' };
    expect(resolvePushEndpoint('grupos', 'UPDATE', p)).toEqual({
      endpoint: '/grupos/x1', method: 'PATCH', body: p,
    });
  });

  test('entidade sem resolver: DELETE com id → DELETE /{entity}/{id}', () => {
    expect(resolvePushEndpoint('grupos', 'DELETE', { id: 'x1' })).toEqual({
      endpoint: '/grupos/x1', method: 'DELETE',
    });
  });
});

describe('retiradas resolver', () => {
  test('CREATE resolve para POST /retiradas com body limpo', () => {
    const payload = {
      id: 'r1',
      idIndustria: 'ind-1',
      idPropriedade: 'prop-1',
      resultadoTeste: true,
      observacao: 'ok',
      quantidade: 50,
      dtColeta: '2026-05-21',
      campoExtra: 'deve ser removido',
    };
    const result = resolvePushEndpoint('retiradas', 'CREATE', payload);
    expect(result.endpoint).toBe('/retiradas');
    expect(result.method).toBe('POST');
    expect(result.body).toEqual({
      id: 'r1',
      idIndustria: 'ind-1',
      idPropriedade: 'prop-1',
      resultadoTeste: true,
      observacao: 'ok',
      quantidade: 50,
      dtColeta: '2026-05-21',
    });
  });

  test('CREATE sem campos opcionais — observacao e resultadoTeste ausentes', () => {
    const payload = { id: 'r2', idIndustria: 'ind-1', idPropriedade: 'prop-1', quantidade: 30, dtColeta: '2026-05-20' };
    const result = resolvePushEndpoint('retiradas', 'CREATE', payload);
    expect(result.body).not.toHaveProperty('observacao');
    expect(result.body).not.toHaveProperty('resultadoTeste');
  });
});

describe('producao_diaria resolver', () => {
  test('CREATE resolve para POST /producao-diaria com body adaptado', () => {
    const payload = {
      id: 'pd1',
      id_propriedade: 'prop-1',
      quantidade: 120,
      dt_registro: '2026-05-21',
      observacao: 'normal',
      id_usuario: 'usr-1',
    };
    const result = resolvePushEndpoint('producao_diaria', 'CREATE', payload);
    expect(result.endpoint).toBe('/producao-diaria');
    expect(result.method).toBe('POST');
    expect(result.body).toEqual({
      id: 'pd1',
      idPropriedade: 'prop-1',
      quantidade: 120,
      dtRegistro: '2026-05-21',
      observacao: 'normal',
    });
    expect(result.body).not.toHaveProperty('id_usuario');
    expect(result.body).not.toHaveProperty('id_propriedade');
    expect(result.body).not.toHaveProperty('dt_registro');
  });

  test('CREATE sem observacao — campo ausente no body', () => {
    const payload = { id: 'pd2', id_propriedade: 'prop-1', quantidade: 80, dt_registro: '2026-05-20' };
    const result = resolvePushEndpoint('producao_diaria', 'CREATE', payload);
    expect(result.body).not.toHaveProperty('observacao');
  });
});

describe('shapeLoteCreate — areaM2 fallback', () => {
  it('inclui area_m2 quando payload tem areaM2', () => {
    const result = resolvePushEndpoint('lotes', 'CREATE', {
      id: 'l1', nomeLote: 'P1', idPropriedade: 'prop1', idGrupo: 'g1',
      tipoLote: 'Pasto', status: 'ativo', qtdMax: 50, areaM2: 12345,
      geoMapa: null,
    });
    expect(result.body.area_m2).toBe(12345);
  });
});

describe('shapeReproducaoCreate — null filtering', () => {
  it('não inclui idBufalo quando é null (IA)', () => {
    const result = resolvePushEndpoint('reproducoes', 'CREATE', {
      id: 'r1', idPropriedade: 'prop1', idBufala: 'buf1',
      idBufalo: null, tipoInseminacao: 'IA', status: 'Em andamento',
      dtEvento: '2026-05-21',
    });
    expect(result.body).not.toHaveProperty('idBufalo');
  });

  it('inclui idBufalo quando é UUID válido (Monta Natural)', () => {
    const result = resolvePushEndpoint('reproducoes', 'CREATE', {
      id: 'r1', idPropriedade: 'prop1', idBufala: 'buf1',
      idBufalo: 'touro-uuid', tipoInseminacao: 'Monta Natural',
      status: 'Em andamento', dtEvento: '2026-05-21',
    });
    expect(result.body.idBufalo).toBe('touro-uuid');
  });
});
