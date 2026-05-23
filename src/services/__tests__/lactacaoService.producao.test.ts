jest.mock('../../database/db');
import { queryFirst } from '../../database/db';
import { getProducaoDiariaAtual } from '../lactacaoService';

const mockQueryFirst = queryFirst as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('getProducaoDiariaAtual', () => {
  it('retorna o último registro de producao_diaria (snapshot, não soma)', async () => {
    mockQueryFirst.mockResolvedValue({ quantidade: 350, dtRegistro: '2026-05-22T03:00:00.000Z' });

    const result = await getProducaoDiariaAtual('prop-1');

    expect(result.quantidade).toBe(350);
    // deve consultar producao_diaria com ORDER BY createdAt DESC LIMIT 1
    const [sql, params] = mockQueryFirst.mock.calls[0];
    expect(sql).toContain('producao_diaria');
    expect(sql).toContain('ORDER BY createdAt DESC');
    expect(sql).toContain('LIMIT 1');
    expect(sql).not.toContain('SUM');
    expect(sql).not.toContain('ordenhas');
    expect(params[0]).toBe('prop-1');
  });

  it('retorna o valor do último registro, não a soma de todos', async () => {
    // Fazendeiro registrou 300 ontem, 150 hoje — dash deve mostrar 150 (último), não 450
    mockQueryFirst.mockResolvedValue({ quantidade: 150, dtRegistro: '2026-05-22T03:00:00.000Z' });

    const result = await getProducaoDiariaAtual('prop-1');

    expect(result.quantidade).toBe(150);
  });

  it('retorna 0 quando não há nenhum registro', async () => {
    mockQueryFirst.mockResolvedValue(null);

    const result = await getProducaoDiariaAtual('prop-1');

    expect(result.quantidade).toBe(0);
  });

  it('retorna 0 sem query quando propriedadeId está vazio', async () => {
    const result = await getProducaoDiariaAtual('');

    expect(result.quantidade).toBe(0);
    expect(mockQueryFirst).not.toHaveBeenCalled();
  });

  it('dataAtualizacao está formatada como DD/MM/YYYY a partir do dtRegistro', async () => {
    mockQueryFirst.mockResolvedValue({ quantidade: 100, dtRegistro: '2026-05-22T03:00:00.000Z' });

    const result = await getProducaoDiariaAtual('prop-1');

    expect(result.dataAtualizacao).toBe('22/05/2026');
  });
});
