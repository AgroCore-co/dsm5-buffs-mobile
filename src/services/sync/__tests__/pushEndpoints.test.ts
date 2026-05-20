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
