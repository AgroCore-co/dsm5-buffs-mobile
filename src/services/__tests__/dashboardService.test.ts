jest.mock('../../database/db');
import { queryAll, queryFirst } from '../../database/db';
import {
  getStats,
  getReproducaoMetricas,
  getEstatisticasLactacao,
  getProducaoMensal,
} from '../dashboardService';

const mockQueryAll = queryAll as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const bufalos = [
  { sexo: 'M', status: 1, nivelMaturidade: 'T', idRaca: 'raca-1' },
  { sexo: 'F', status: 1, nivelMaturidade: 'V', idRaca: 'raca-1' },
  { sexo: 'F', status: 1, nivelMaturidade: 'V', idRaca: 'raca-2' },
  { sexo: 'F', status: 1, nivelMaturidade: 'N', idRaca: 'raca-1' },
  { sexo: 'F', status: 1, nivelMaturidade: 'B', idRaca: 'raca-2' },
  { sexo: 'F', status: 0, nivelMaturidade: 'V', idRaca: 'raca-1' }, // inativa
];

const racas = [
  { id: 'raca-1', _raw: JSON.stringify({ nome: 'Murrah' }) },
  { id: 'raca-2', _raw: JSON.stringify({ nome: 'Mediterrânea' }) },
];

describe('getStats', () => {
  function setupMocks() {
    mockQueryAll.mockImplementation((sql: string) => {
      if (sql.includes('FROM bufalos')) return Promise.resolve(bufalos);
      if (sql.includes('FROM racas')) return Promise.resolve(racas);
      return Promise.resolve([]);
    });
    mockQueryFirst.mockImplementation((sql: string) => {
      if (sql.includes('ciclos_lactacao')) return Promise.resolve({ total: 3 });
      if (sql.includes('lotes')) return Promise.resolve({ total: 2 });
      return Promise.resolve(null);
    });
  }

  test('conta machos e fêmeas ativas corretamente', async () => {
    setupMocks();
    const result = await getStats('prop-1');
    expect(result.qtd_macho_ativos).toBe(1);
    expect(result.qtd_femeas_ativas).toBe(4);
  });

  test('conta total incluindo inativos', async () => {
    setupMocks();
    const result = await getStats('prop-1');
    expect(result.qtd_bufalos_registradas).toBe(6);
  });

  test('conta por nível de maturidade (só ativos)', async () => {
    setupMocks();
    const result = await getStats('prop-1');
    expect(result.qtd_bufalos_touro).toBe(1);
    expect(result.qtd_bufalos_vaca).toBe(2);
    expect(result.qtd_bufalos_novilha).toBe(1);
    expect(result.qtd_bufalos_bezerro).toBe(1);
  });

  test('retorna qtd_bufalas_lactando e qtd_lotes do banco', async () => {
    setupMocks();
    const result = await getStats('prop-1');
    expect(result.qtd_bufalas_lactando).toBe(3);
    expect(result.qtd_lotes).toBe(2);
    expect(result.qtd_usuarios).toBe(0);
  });

  test('bufalosPorRaca agrupado corretamente (só ativos)', async () => {
    setupMocks();
    const result = await getStats('prop-1');
    const murrah = result.bufalosPorRaca.find((r: any) => r.raca === 'Murrah');
    const med = result.bufalosPorRaca.find((r: any) => r.raca === 'Mediterrânea');
    expect(murrah?.quantidade).toBe(3); // touro + vaca + novilha ativos de raca-1
    expect(med?.quantidade).toBe(2);   // vaca + bezerro ativos de raca-2
  });

  test('tabela vazia retorna zeros sem erro', async () => {
    mockQueryAll.mockResolvedValue([]);
    mockQueryFirst.mockResolvedValue({ total: 0 });
    const result = await getStats('prop-1');
    expect(result.qtd_macho_ativos).toBe(0);
    expect(result.qtd_femeas_ativas).toBe(0);
    expect(result.bufalosPorRaca).toEqual([]);
  });
});

describe('getReproducaoMetricas', () => {
  test('conta reproduções por status e trata Concluída como Confirmada', async () => {
    mockQueryAll.mockResolvedValue([
      { _raw: JSON.stringify({ status: 'Em andamento', dtEvento: '2026-04-01' }) },
      { _raw: JSON.stringify({ status: 'Em andamento', dtEvento: '2026-04-15' }) },
      { _raw: JSON.stringify({ status: 'Confirmada', dtEvento: '2026-03-10' }) },
      { _raw: JSON.stringify({ status: 'Concluída', dtEvento: '2026-03-05' }) },
      { _raw: JSON.stringify({ status: 'Falha', dtEvento: '2026-02-20' }) },
    ]);
    const result = await getReproducaoMetricas('prop-1');
    expect(result.totalEmAndamento).toBe(2);
    expect(result.totalConfirmada).toBe(2); // Confirmada + Concluída
    expect(result.totalFalha).toBe(1);
  });

  test('ultimaDataReproducao retorna a mais recente formatada DD/MM/YYYY', async () => {
    mockQueryAll.mockResolvedValue([
      { _raw: JSON.stringify({ status: 'Confirmada', dtEvento: '2026-04-01' }) },
      { _raw: JSON.stringify({ status: 'Em andamento', dtEvento: '2026-05-10' }) },
    ]);
    const result = await getReproducaoMetricas('prop-1');
    expect(result.ultimaDataReproducao).toBe('10/05/2026');
  });

  test('sem reproduções retorna zeros e ultimaDataReproducao null', async () => {
    mockQueryAll.mockResolvedValue([]);
    const result = await getReproducaoMetricas('prop-1');
    expect(result.totalEmAndamento).toBe(0);
    expect(result.ultimaDataReproducao).toBeNull();
  });
});

describe('getEstatisticasLactacao', () => {
  const hoje = new Date();
  const em20Dias = new Date(hoje); em20Dias.setDate(hoje.getDate() + 20);
  const em40Dias = new Date(hoje); em40Dias.setDate(hoje.getDate() + 40);
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  const haMes = new Date(hoje); haMes.setDate(hoje.getDate() - 30);

  const rows = [
    { status: 'Em Lactação', _raw: JSON.stringify({ dtParto: haMes.toISOString(), dtSecagemPrevista: em20Dias.toISOString() }) },
    { status: 'Em Lactação', _raw: JSON.stringify({ dtParto: haMes.toISOString(), dtSecagemPrevista: ontem.toISOString() }) },
    { status: 'Em Lactação', _raw: JSON.stringify({ dtParto: haMes.toISOString(), dtSecagemPrevista: em40Dias.toISOString() }) },
    { status: 'Seca', _raw: JSON.stringify({}) },
    { status: 'Seca', _raw: JSON.stringify({}) },
  ];

  test('conta total, ativos, secos', async () => {
    mockQueryAll.mockResolvedValue(rows);
    const result = await getEstatisticasLactacao('prop-1');
    expect(result.total_ciclos).toBe(5);
    expect(result.ciclos_ativos).toBe(3);
    expect(result.ciclos_secos).toBe(2);
  });

  test('ciclos_proximos_secagem = ativos com dtSecagemPrevista nos próximos 30 dias', async () => {
    mockQueryAll.mockResolvedValue(rows);
    const result = await getEstatisticasLactacao('prop-1');
    expect(result.ciclos_proximos_secagem).toBe(1);
  });

  test('ciclos_secagem_atrasada = ativos com dtSecagemPrevista < hoje', async () => {
    mockQueryAll.mockResolvedValue(rows);
    const result = await getEstatisticasLactacao('prop-1');
    expect(result.ciclos_secagem_atrasada).toBe(1);
  });

  test('tabela vazia retorna zeros sem erro', async () => {
    mockQueryAll.mockResolvedValue([]);
    const result = await getEstatisticasLactacao('prop-1');
    expect(result.total_ciclos).toBe(0);
    expect(result.media_dias_lactacao).toBe(0);
  });
});

describe('getProducaoMensal', () => {
  test('agrupa por mês e soma litros, conta búfalas e dias únicos', async () => {
    mockQueryAll.mockResolvedValue([
      { _raw: JSON.stringify({ dtOrdenha: '2026-01-10', qtOrdenha: 20, idBufala: 'b1' }) },
      { _raw: JSON.stringify({ dtOrdenha: '2026-01-10', qtOrdenha: 15, idBufala: 'b2' }) },
      { _raw: JSON.stringify({ dtOrdenha: '2026-01-11', qtOrdenha: 20, idBufala: 'b1' }) },
      { _raw: JSON.stringify({ dtOrdenha: '2026-02-05', qtOrdenha: 30, idBufala: 'b1' }) },
    ]);
    const result = await getProducaoMensal('prop-1', 2026);
    const jan = result.serie_historica.find((m: any) => m.mes === '2026-01');
    const fev = result.serie_historica.find((m: any) => m.mes === '2026-02');
    expect(jan?.total_litros).toBe(55);
    expect(jan?.qtd_bufalas).toBe(2);
    expect(jan?.media_diaria).toBeCloseTo(55 / 2, 1);
    expect(fev?.total_litros).toBe(30);
  });

  test('série histórica tem 12 meses do ano referência', async () => {
    mockQueryAll.mockResolvedValue([]);
    const result = await getProducaoMensal('prop-1', 2026);
    expect(result.serie_historica).toHaveLength(12);
    expect(result.serie_historica[0].mes).toBe('2026-01');
    expect(result.serie_historica[11].mes).toBe('2026-12');
  });

  test('meses sem dados retornam total_litros=0', async () => {
    mockQueryAll.mockResolvedValue([]);
    const result = await getProducaoMensal('prop-1', 2026);
    result.serie_historica.forEach((m: any) => {
      expect(m.total_litros).toBe(0);
    });
  });

  test('variacao_percentual calculada corretamente', async () => {
    const agora = new Date();
    const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    const mesAnteriorDate = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const mesAnterior = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, '0')}`;

    mockQueryAll.mockResolvedValue([
      { _raw: JSON.stringify({ dtOrdenha: `${mesAnterior}-01`, qtOrdenha: 100, idBufala: 'b1' }) },
      { _raw: JSON.stringify({ dtOrdenha: `${mesAtual}-01`, qtOrdenha: 150, idBufala: 'b1' }) },
    ]);
    const result = await getProducaoMensal('prop-1', agora.getFullYear());
    expect(result.variacao_percentual).toBeCloseTo(50, 0);
  });
});
