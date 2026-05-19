jest.mock('../../src/database/db', () => ({
  queryAll: jest.fn(),
  queryFirst: jest.fn(),
  execute: jest.fn(),
}));
jest.mock('../../src/services/pendingOperationsService', () => ({
  enqueue: jest.fn(),
}));
jest.mock('react-native-uuid', () => ({ v4: () => 'new-uuid' }));
jest.mock('../../src/services/adapters/bufaloAdapter', () => ({
  sanitarioToApiAdapter: (p: any) => ({ ...p, adapted: true }),
}));

import { queryAll, queryFirst, execute } from '../../src/database/db';
import { enqueue } from '../../src/services/pendingOperationsService';
import { sanitarioService } from '../../src/services/sanitarioService';

const EVENTO_RAW = { id: 'e1', bufaloId: 'b1', propriedadeId: 'p1', tipo: 'vacinacao', updatedAt: '2026-01-01', medicacoe: { medicacao: 'Ivermectina', tipoTratamento: 'Antiparasitário' } };

beforeEach(() => jest.clearAllMocks());

describe('sanitarioService.add', () => {
  it('inserts to SQLite and enqueues CREATE', async () => {
    (execute as jest.Mock).mockResolvedValue(undefined);
    (enqueue as jest.Mock).mockResolvedValue(undefined);

    const result = await sanitarioService.add({ id_bufalo: 'b1', id_propriedade: 'p1' });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO eventos_sanitarios'),
      expect.arrayContaining(['new-uuid']),
    );
    expect(enqueue).toHaveBeenCalledWith('eventos_sanitarios', 'CREATE', expect.any(Object));
    expect(result.id).toBe('new-uuid');
  });
});

describe('sanitarioService.getHistorico', () => {
  it('returns parsed events from SQLite', async () => {
    (queryAll as jest.Mock).mockResolvedValue([{ _raw: JSON.stringify(EVENTO_RAW) }]);
    (queryFirst as jest.Mock).mockResolvedValue({ total: 1 });

    const result = await sanitarioService.getHistorico('b1');
    expect(result.data[0].nome_medicamento).toBe('Ivermectina');
    expect(result.meta.total).toBe(1);
  });
});

describe('sanitarioService.getMedicamentos', () => {
  it('returns medicamentos from SQLite', async () => {
    (queryAll as jest.Mock).mockResolvedValue([{ _raw: JSON.stringify({ id: 'm1', medicacao: 'Vitamina' }) }]);
    const result = await sanitarioService.getMedicamentos();
    expect(result[0].medicacao).toBe('Vitamina');
  });
});

describe('sanitarioService.delete', () => {
  it('deletes and enqueues DELETE', async () => {
    (execute as jest.Mock).mockResolvedValue(undefined);
    (enqueue as jest.Mock).mockResolvedValue(undefined);

    await sanitarioService.delete('e1');

    expect(execute).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM eventos_sanitarios'), ['e1']);
    expect(enqueue).toHaveBeenCalledWith('eventos_sanitarios', 'DELETE', { id: 'e1' });
  });
});

describe('sanitarioService.update', () => {
  it('merges, updates SQLite and enqueues UPDATE', async () => {
    (queryFirst as jest.Mock).mockResolvedValue({ _raw: JSON.stringify(EVENTO_RAW) });
    (execute as jest.Mock).mockResolvedValue(undefined);
    (enqueue as jest.Mock).mockResolvedValue(undefined);

    await sanitarioService.update('e1', { tipo: 'vermifugo' });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE eventos_sanitarios'),
      expect.any(Array),
    );
    expect(enqueue).toHaveBeenCalledWith('eventos_sanitarios', 'UPDATE', expect.objectContaining({ id: 'e1' }));
  });
});
