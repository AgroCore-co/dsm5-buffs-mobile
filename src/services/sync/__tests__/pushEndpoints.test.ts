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
  test('CREATE → POST /dados-zootecnicos/bufalo/{bufaloId}', () => {
    const p = { id: 'z1', bufaloId: 'b9', peso: 480 };
    expect(resolvePushEndpoint('pesagens', 'CREATE', p)).toEqual({
      endpoint: '/dados-zootecnicos/bufalo/b9', method: 'POST', body: p,
    });
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
    const p = { id: 's1', bufaloId: 'b9' };
    expect(resolvePushEndpoint('eventos_sanitarios', 'CREATE', p)).toEqual({
      endpoint: '/dados-sanitarios', method: 'POST', body: p,
    });
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
  test('CREATE → POST /cobertura', () => {
    const p = { id: 'r1', idBufala: 'b1' };
    expect(resolvePushEndpoint('reproducoes', 'CREATE', p)).toEqual({
      endpoint: '/cobertura', method: 'POST', body: p,
    });
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
  test('CREATE → POST /lactacao', () => {
    const p = { id: 'c1', dt_parto: '2026-01-10' };
    expect(resolvePushEndpoint('ciclos_lactacao', 'CREATE', p)).toEqual({
      endpoint: '/lactacao', method: 'POST', body: p,
    });
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
