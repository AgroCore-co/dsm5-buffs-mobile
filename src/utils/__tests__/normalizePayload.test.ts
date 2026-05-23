import { normalizePayload } from '../normalizePayload';

describe('normalizePayload', () => {
  test('normaliza alias para canonical quando canonical ausente', () => {
    const result = normalizePayload({ id_bufala: 'abc' }, { idBufala: ['id_bufala'] });
    expect(result.idBufala).toBe('abc');
  });

  test('não sobrescreve canonical se já presente', () => {
    const result = normalizePayload(
      { idBufala: 'original', id_bufala: 'alias' },
      { idBufala: ['id_bufala'] },
    );
    expect(result.idBufala).toBe('original');
  });

  test('preserva campos sem alias no resultado', () => {
    const result = normalizePayload(
      { observacao: 'obs', id_bufala: 'abc' },
      { idBufala: ['id_bufala'] },
    );
    expect(result.observacao).toBe('obs');
    expect(result.idBufala).toBe('abc');
  });

  test('retorna novo objeto (não muta o original)', () => {
    const original = { id_bufala: 'abc' };
    const result = normalizePayload(original, { idBufala: ['id_bufala'] });
    expect(result).not.toBe(original);
    expect((original as any).idBufala).toBeUndefined();
  });

  test('funciona com lista de aliases vazia', () => {
    const result = normalizePayload({ foo: 'bar' }, { idBufala: [] });
    expect(result.idBufala).toBeUndefined();
    expect(result.foo).toBe('bar');
  });

  test('usa primeiro alias que encontrar quando canonical ausente', () => {
    const result = normalizePayload(
      { padrao_dias: 305 },
      { padraoDias: ['padrao_dias', 'padrao_dias_lactacao'] },
    );
    expect(result.padraoDias).toBe(305);
  });

  test('usa segundo alias quando primeiro ausente', () => {
    const result = normalizePayload(
      { padrao_dias_lactacao: 280 },
      { padraoDias: ['padrao_dias', 'padrao_dias_lactacao'] },
    );
    expect(result.padraoDias).toBe(280);
  });
});
