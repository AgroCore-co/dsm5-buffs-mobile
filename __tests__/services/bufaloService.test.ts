jest.mock('../../src/database/db', () => ({
  queryAll: jest.fn(),
  queryFirst: jest.fn(),
  execute: jest.fn(),
}));
jest.mock('../../src/services/pendingOperationsService', () => ({
  enqueue: jest.fn(),
}));
jest.mock('react-native-uuid', () => ({ v4: () => 'new-uuid' }));
jest.mock('../../src/services/grupoService', () => ({
  grupoService: { getAllByPropriedade: jest.fn().mockResolvedValue([]) },
}));

import { queryAll, queryFirst, execute } from '../../src/database/db';
import { enqueue } from '../../src/services/pendingOperationsService';
import {
  getBufalos,
  getBufaloDetalhes,
  createBufalo,
  updateBufalo,
  deleteBufalo,
  getRacas,
  filtrarBufalos,
  getBufaloByBrincoAndSexo,
} from '../../src/services/bufaloService';

const BUFALO_RAW = { id: '1', propriedadeId: 'p1', brinco: 'A001', sexo: 'F', nivelMaturidade: 'adulto', status: true, idRaca: 'r1', updatedAt: '2026-01-01', nomeRaca: 'Murrah' };

beforeEach(() => jest.clearAllMocks());

describe('getBufalos', () => {
  it('returns parsed bufalos from SQLite', async () => {
    (queryAll as jest.Mock).mockResolvedValue([{ _raw: JSON.stringify(BUFALO_RAW) }]);
    (queryFirst as jest.Mock).mockResolvedValue({ total: 1 });

    const result = await getBufalos('p1');
    expect(result.bufalos[0].brinco).toBe('A001');
    expect(result.bufalos[0].racaNome).toBe('Murrah');
    expect(result.meta.total).toBe(1);
  });
});

describe('getBufaloDetalhes', () => {
  it('returns parsed bufalo with paiNome/maeNome', async () => {
    (queryFirst as jest.Mock).mockResolvedValue({ _raw: JSON.stringify(BUFALO_RAW) });
    const result = await getBufaloDetalhes('1');
    expect(result.brinco).toBe('A001');
    expect(result.paiNome).toBe('Desconhecido');
    expect(result.maeNome).toBe('Desconhecida');
  });

  it('throws when bufalo not found', async () => {
    (queryFirst as jest.Mock).mockResolvedValue(null);
    await expect(getBufaloDetalhes('missing')).rejects.toThrow();
  });
});

describe('createBufalo', () => {
  it('inserts to SQLite and enqueues CREATE', async () => {
    (execute as jest.Mock).mockResolvedValue(undefined);
    (enqueue as jest.Mock).mockResolvedValue(undefined);

    const result = await createBufalo({ propriedadeId: 'p1', brinco: 'B002', sexo: 'M', status: true });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO bufalos'),
      expect.arrayContaining(['new-uuid', 'p1', 'B002']),
    );
    expect(enqueue).toHaveBeenCalledWith('bufalos', 'CREATE', expect.objectContaining({ brinco: 'B002' }));
    expect(result.id).toBe('new-uuid');
  });
});

describe('updateBufalo', () => {
  it('merges and updates SQLite then enqueues UPDATE', async () => {
    (queryFirst as jest.Mock).mockResolvedValue({ _raw: JSON.stringify(BUFALO_RAW) });
    (execute as jest.Mock).mockResolvedValue(undefined);
    (enqueue as jest.Mock).mockResolvedValue(undefined);

    await updateBufalo('1', { brinco: 'A002' });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE bufalos'),
      expect.arrayContaining(['A002']),
    );
    expect(enqueue).toHaveBeenCalledWith('bufalos', 'UPDATE', expect.objectContaining({ brinco: 'A002' }));
  });
});

describe('deleteBufalo', () => {
  it('deletes from SQLite and enqueues DELETE', async () => {
    (execute as jest.Mock).mockResolvedValue(undefined);
    (enqueue as jest.Mock).mockResolvedValue(undefined);

    const result = await deleteBufalo('1');

    expect(execute).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM bufalos'), ['1']);
    expect(enqueue).toHaveBeenCalledWith('bufalos', 'DELETE', { id: '1' });
    expect(result).toBe(true);
  });
});

describe('getRacas', () => {
  it('returns parsed racas from SQLite', async () => {
    (queryAll as jest.Mock).mockResolvedValue([{ _raw: JSON.stringify({ id: 'r1', nome: 'Murrah' }) }]);
    const result = await getRacas();
    expect(result[0].nome).toBe('Murrah');
  });
});

describe('filtrarBufalos', () => {
  it('applies filters to SQL query', async () => {
    (queryAll as jest.Mock).mockResolvedValue([{ _raw: JSON.stringify(BUFALO_RAW) }]);
    (queryFirst as jest.Mock).mockResolvedValue({ total: 1 });

    await filtrarBufalos('p1', { sexo: 'F', brinco: 'A' });

    expect(queryAll).toHaveBeenCalledWith(
      expect.stringContaining('sexo = ?'),
      expect.arrayContaining(['F']),
    );
  });
});

describe('getBufaloByBrincoAndSexo', () => {
  it('returns bufalo when found', async () => {
    (queryFirst as jest.Mock).mockResolvedValue({ _raw: JSON.stringify(BUFALO_RAW) });
    const result = await getBufaloByBrincoAndSexo('p1', 'A001', 'F');
    expect(result?.brinco).toBe('A001');
  });

  it('returns null when not found', async () => {
    (queryFirst as jest.Mock).mockResolvedValue(null);
    const result = await getBufaloByBrincoAndSexo('p1', 'XXXX', 'M');
    expect(result).toBeNull();
  });
});
