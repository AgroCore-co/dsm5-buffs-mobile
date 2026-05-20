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
