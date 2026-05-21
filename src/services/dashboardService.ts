import { queryAll, queryFirst } from '../database/db';
import { formatarDataBR } from '../utils/date';

export async function getStats(propriedadeId: string) {
  const bufalos = await queryAll<{
    sexo: string; status: number; nivelMaturidade: string; idRaca: string;
  }>(
    `SELECT sexo, status, nivelMaturidade, idRaca FROM bufalos WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId]
  );

  const ativos = bufalos.filter(b => b.status === 1);
  const qtd_macho_ativos = ativos.filter(b => b.sexo === 'M').length;
  const qtd_femeas_ativas = ativos.filter(b => b.sexo === 'F').length;
  const qtd_bufalos_registradas = bufalos.length;
  const qtd_bufalos_bezerro = ativos.filter(b => b.nivelMaturidade === 'Bezerro').length;
  const qtd_bufalos_novilha = ativos.filter(b => b.nivelMaturidade === 'Novilha').length;
  const qtd_bufalos_vaca = ativos.filter(b => b.nivelMaturidade === 'Vaca').length;
  const qtd_bufalos_touro = ativos.filter(b => b.nivelMaturidade === 'Touro').length;

  const lactRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM ciclos_lactacao WHERE propriedadeId = ? AND status = 'Em Lactação' AND deletedAt IS NULL`,
    [propriedadeId]
  );
  const qtd_bufalas_lactando = lactRow?.total ?? 0;

  const lotesRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM lotes WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId]
  );
  const qtd_lotes = lotesRow?.total ?? 0;

  const racaRows = await queryAll<{ id: string; _raw: string }>(
    `SELECT id, _raw FROM racas WHERE deletedAt IS NULL`
  );
  const racaMap = new Map(racaRows.map(r => {
    const raw = JSON.parse(r._raw);
    return [r.id, (raw.nome as string) ?? 'Desconhecida'];
  }));

  const racaCount = new Map<string, number>();
  for (const b of ativos) {
    const nome = racaMap.get(b.idRaca) ?? 'Desconhecida';
    racaCount.set(nome, (racaCount.get(nome) ?? 0) + 1);
  }
  const bufalosPorRaca = Array.from(racaCount.entries()).map(([raca, quantidade]) => ({ raca, quantidade }));

  return {
    qtd_macho_ativos,
    qtd_femeas_ativas,
    qtd_bufalos_registradas,
    qtd_bufalos_bezerro,
    qtd_bufalos_novilha,
    qtd_bufalos_vaca,
    qtd_bufalos_touro,
    qtd_bufalas_lactando,
    qtd_lotes,
    qtd_usuarios: 0,
    bufalosPorRaca,
  };
}

export async function getReproducaoMetricas(propriedadeId: string) {
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM reproducoes WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId]
  );
  const reproducoes = rows.map(r => JSON.parse(r._raw));

  const totalEmAndamento = reproducoes.filter(r => r.status === 'Em andamento').length;
  const totalConfirmada = reproducoes.filter(r => r.status === 'Confirmada').length;
  const totalFalha = reproducoes.filter(r => r.status === 'Falha').length;

  const datas = reproducoes
    .map(r => r.dtEvento as string | undefined)
    .filter((d): d is string => !!d)
    .sort()
    .reverse();
  const ultimaDataReproducao = datas.length > 0 ? formatarDataBR(datas[0]) : null;

  return { totalEmAndamento, totalConfirmada, totalFalha, ultimaDataReproducao };
}

export async function getEstatisticasLactacao(propriedadeId: string) {
  const rows = await queryAll<{ status: string; _raw: string }>(
    `SELECT status, _raw FROM ciclos_lactacao WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId]
  );

  const total_ciclos = rows.length;
  const ciclos_ativos = rows.filter(r => r.status === 'Em Lactação').length;
  const ciclos_secos = rows.filter(r => r.status === 'Seca').length;

  const hoje = new Date();
  const em30Dias = new Date(hoje);
  em30Dias.setDate(hoje.getDate() + 30);

  let somaDias = 0;
  let countComParto = 0;
  let ciclos_proximos_secagem = 0;
  let ciclos_secagem_atrasada = 0;

  for (const row of rows.filter(r => r.status === 'Em Lactação')) {
    const raw = JSON.parse(row._raw);
    if (raw.dtParto) {
      const parto = new Date(raw.dtParto);
      somaDias += Math.floor((hoje.getTime() - parto.getTime()) / (1000 * 60 * 60 * 24));
      countComParto++;
    }
    if (raw.dtSecagemPrevista) {
      const secagem = new Date(raw.dtSecagemPrevista);
      if (secagem < hoje) {
        ciclos_secagem_atrasada++;
      } else if (secagem <= em30Dias) {
        ciclos_proximos_secagem++;
      }
    }
  }

  const media_dias_lactacao = countComParto > 0 ? Math.round(somaDias / countComParto) : 0;

  return {
    total_ciclos,
    ciclos_ativos,
    ciclos_secos,
    media_dias_lactacao,
    ciclos_proximos_secagem,
    ciclos_secagem_atrasada,
  };
}

export async function getProducaoMensal(propriedadeId: string, ano?: number) {
  const refAno = ano ?? new Date().getFullYear();
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM ordenhas WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId]
  );

  type MonthData = { litros: number; bufalas: Set<string>; dias: Set<string> };
  const byMonth = new Map<string, MonthData>();
  for (let m = 1; m <= 12; m++) {
    const key = `${refAno}-${String(m).padStart(2, '0')}`;
    byMonth.set(key, { litros: 0, bufalas: new Set(), dias: new Set() });
  }

  for (const row of rows) {
    const o = JSON.parse(row._raw);
    if (!o.dtOrdenha) continue;
    const month = (o.dtOrdenha as string).slice(0, 7);
    if (!byMonth.has(month)) continue;
    const entry = byMonth.get(month)!;
    entry.litros += Number(o.qtOrdenha ?? 0);
    if (o.idBufala) entry.bufalas.add(o.idBufala);
    entry.dias.add((o.dtOrdenha as string).slice(0, 10));
  }

  const serie_historica = Array.from(byMonth.entries()).map(([mes, data]) => ({
    mes,
    total_litros: data.litros,
    qtd_bufalas: data.bufalas.size,
    media_diaria: data.dias.size > 0 ? data.litros / data.dias.size : 0,
  }));

  const agora = new Date();
  const mesAtualKey = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  const mesAnteriorDate = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const mesAnteriorKey = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, '0')}`;

  const mesAtual = byMonth.get(mesAtualKey) ?? { litros: 0, bufalas: new Set<string>(), dias: new Set<string>() };
  const mesAnterior = byMonth.get(mesAnteriorKey) ?? { litros: 0, bufalas: new Set<string>(), dias: new Set<string>() };

  const variacao_percentual = mesAnterior.litros > 0
    ? Math.round(((mesAtual.litros - mesAnterior.litros) / mesAnterior.litros) * 10000) / 100
    : 0;

  return {
    ano: refAno,
    mes_atual_litros: mesAtual.litros,
    mes_anterior_litros: mesAnterior.litros,
    variacao_percentual,
    bufalas_lactantes_atual: mesAtual.bufalas.size,
    serie_historica,
  };
}
