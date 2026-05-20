jest.mock('../../src/database/db', () => ({
  queryAll: jest.fn(),
  queryFirst: jest.fn(),
  execute: jest.fn(),
}));
jest.mock('../../src/services/pendingOperationsService', () => ({
  enqueue: jest.fn(),
}));
jest.mock('react-native-uuid', () => ({ v4: () => 'new-uuid' }));
jest.mock('../../src/lib/apiClient', () => ({ apiFetch: jest.fn() }));
jest.mock('../../src/utils/date', () => ({ formatarDataBR: (d: string) => d }));

import { queryAll, queryFirst, execute } from '../../src/database/db';
import { enqueue } from '../../src/services/pendingOperationsService';
import {
  getCiclosLactacao,
  registrarLactacaoApi,
  encerrarLactacao,
} from '../../src/services/lactacaoService';

const CICLO_RAW = { idCicloLactacao: 'c1', idBufala: 'b1', propriedadeId: 'p1', status: 'ativo', bufala: { nome: 'Lua', brinco: 'A001', raca: 'Murrah' }, diasEmLactacao: 30, dtSecagemPrevista: '2026-06-01', updatedAt: '2026-01-01' };

beforeEach(() => jest.clearAllMocks());

describe('getCiclosLactacao', () => {
  it('returns empty when no propriedadeId', async () => {
    const result = await getCiclosLactacao('');
    expect(result.ciclos).toEqual([]);
  });

  it('returns parsed ciclos from SQLite', async () => {
    (queryAll as jest.Mock).mockResolvedValue([{ _raw: JSON.stringify(CICLO_RAW) }]);
    (queryFirst as jest.Mock).mockResolvedValue({ total: 1 });

    const result = await getCiclosLactacao('p1');
    expect(result.ciclos[0].brinco).toBe('A001');
    expect(result.meta.totalItems).toBe(1);
  });
});

describe('registrarLactacaoApi', () => {
  it('insere local e enfileira CREATE de ordenhas em camelCase', async () => {
    (execute as jest.Mock).mockResolvedValue(undefined);
    (enqueue as jest.Mock).mockResolvedValue(undefined);

    await registrarLactacaoApi({
      id_bufala: 'b1', id_propriedade: 'p1', id_ciclo_lactacao: 'c1',
      qt_ordenha: 5, periodo: 'M', dt_ordenha: '2026-01-01',
    });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ordenhas'),
      expect.arrayContaining(['new-uuid', 'p1', 'b1', 'c1'])
    );
    expect(enqueue).toHaveBeenCalledWith(
      'ordenhas', 'CREATE',
      expect.objectContaining({ id: 'new-uuid', idBufala: 'b1', idCicloLactacao: 'c1', qtOrdenha: 5, dtOrdenha: '2026-01-01' })
    );
  });
});

describe('encerrarLactacao', () => {
  it('updates local status and enqueues UPDATE', async () => {
    (execute as jest.Mock).mockResolvedValue(undefined);
    (enqueue as jest.Mock).mockResolvedValue(undefined);

    await encerrarLactacao('c1');

    expect(execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE ciclos_lactacao'), ['seco', 'c1']);
    expect(enqueue).toHaveBeenCalledWith('ciclos_lactacao', 'UPDATE', expect.objectContaining({ id: 'c1', status: 'seco' }));
  });

  it('throws when idCiclo is empty', async () => {
    await expect(encerrarLactacao('')).rejects.toThrow();
  });
});
