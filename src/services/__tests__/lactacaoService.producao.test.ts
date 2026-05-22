jest.mock('../../database/db');
import { queryFirst } from '../../database/db';
import { getProducaoDiariaAtual } from '../lactacaoService';

const mockQueryFirst = queryFirst as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('getProducaoDiariaAtual', () => {
  it('retorna quantidade de producao_diaria para hoje', async () => {
    mockQueryFirst.mockResolvedValue({ total: 350 });

    const result = await getProducaoDiariaAtual('prop-1');

    expect(result.quantidade).toBe(350);
    // deve consultar producao_diaria, não ordenhas
    const [sql, params] = mockQueryFirst.mock.calls[0];
    expect(sql).toContain('producao_diaria');
    expect(sql).not.toContain('ordenhas');
    expect(params[0]).toBe('prop-1');
  });

  it('retorna 0 quando não há registro para hoje', async () => {
    mockQueryFirst.mockResolvedValue(null);

    const result = await getProducaoDiariaAtual('prop-1');

    expect(result.quantidade).toBe(0);
  });

  it('retorna 0 sem query quando propriedadeId está vazio', async () => {
    const result = await getProducaoDiariaAtual('');

    expect(result.quantidade).toBe(0);
    expect(mockQueryFirst).not.toHaveBeenCalled();
  });

  it('dataAtualizacao está formatada como DD/MM/YYYY', async () => {
    mockQueryFirst.mockResolvedValue({ total: 100 });

    const result = await getProducaoDiariaAtual('prop-1');

    expect(result.dataAtualizacao).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});
