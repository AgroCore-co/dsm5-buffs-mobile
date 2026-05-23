jest.mock('../../database/db');
jest.mock('../pendingOperationsService');
jest.mock('react-native-uuid', () => ({ v4: () => 'mock-uuid-ciclo' }));

import { execute, queryFirst } from '../../database/db';
import { enqueue } from '../pendingOperationsService';
import { createCicloLactacao, registrarParto } from '../reproducaoService';

const mockExecute = execute as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('createCicloLactacao', () => {
  test('insere row no SQLite com os campos normalizados', async () => {
    await createCicloLactacao({
      id_bufala: 'bufala-1',
      id_propriedade: 'prop-1',
      dt_parto: '2026-01-15',
      padrao_dias: 305,
      observacao: '',
    } as any);

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ciclos_lactacao'),
      expect.arrayContaining(['mock-uuid-ciclo', 'prop-1', 'bufala-1']),
    );
  });

  test('enfileira com payload camelCase — idBufala e idPropriedade não undefined', async () => {
    await createCicloLactacao({
      id_bufala: 'bufala-1',
      id_propriedade: 'prop-1',
      dt_parto: '2026-01-15',
      padrao_dias: 305,
      observacao: '',
    } as any);

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.idBufala).toBe('bufala-1');
    expect(payload.idPropriedade).toBe('prop-1');
    expect(payload.dtParto).toBe('2026-01-15');
    expect(payload.padraoDias).toBe(305);
  });

  test('normaliza padrao_dias_lactacao como alias de padraoDias', async () => {
    await createCicloLactacao({
      id_bufala: 'bufala-1',
      id_propriedade: 'prop-1',
      dt_parto: '2026-01-15',
      padrao_dias_lactacao: 280,
      observacao: '',
    } as any);

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.padraoDias).toBe(280);
  });
});

describe('registrarParto', () => {
  const reproducaoRaw = {
    id: 'repr-1',
    idBufala: 'bufala-42',
    idPropriedade: 'prop-1',
    status: 'Em andamento',
  };

  beforeEach(() => {
    mockQueryFirst.mockResolvedValue({ _raw: JSON.stringify(reproducaoRaw) });
  });

  test('com criar_ciclo_lactacao=true chama createCicloLactacao (INSERT + enqueue para ciclo)', async () => {
    await registrarParto('repr-1', {
      dt_parto: '2026-01-15',
      tipo_parto: 'Normal',
      criar_ciclo_lactacao: true,
      padrao_dias_lactacao: 305,
    });

    const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
      c[0].includes('INSERT INTO ciclos_lactacao'),
    );
    expect(insertCalls.length).toBe(1);

    const cicloEnqueue = mockEnqueue.mock.calls.find((c: any[]) => c[0] === 'ciclos_lactacao');
    expect(cicloEnqueue).toBeDefined();
    expect(cicloEnqueue[2].idBufala).toBe('bufala-42');
  });

  test('com criar_ciclo_lactacao=false NÃO cria ciclo', async () => {
    await registrarParto('repr-1', {
      dt_parto: '2026-01-15',
      tipo_parto: 'Normal',
      criar_ciclo_lactacao: false,
    });

    const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
      c[0].includes('INSERT INTO ciclos_lactacao'),
    );
    expect(insertCalls.length).toBe(0);

    const cicloEnqueue = mockEnqueue.mock.calls.find((c: any[]) => c[0] === 'ciclos_lactacao');
    expect(cicloEnqueue).toBeUndefined();
  });

  test('sem criar_ciclo_lactacao NÃO cria ciclo', async () => {
    await registrarParto('repr-1', {
      dt_parto: '2026-01-15',
      tipo_parto: 'Normal',
      criar_ciclo_lactacao: false,
    });

    const cicloEnqueue = mockEnqueue.mock.calls.find((c: any[]) => c[0] === 'ciclos_lactacao');
    expect(cicloEnqueue).toBeUndefined();
  });
});
