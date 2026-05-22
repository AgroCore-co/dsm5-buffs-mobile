// src/services/__tests__/bufaloService.update.test.ts
import { updateBufalo, getBufaloById } from '../bufaloService';
import { queryFirst, execute } from '../../database/db';
import { enqueue } from '../pendingOperationsService';

jest.mock('../../database/db');
jest.mock('../pendingOperationsService');

const mockExecute = execute as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

const existingRaw = {
  id: 'b1', brinco: '001', sexo: 'F',
  nivelMaturidade: 'B', status: true, idRaca: 'raca-old',
  idPai: null, idMae: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryFirst.mockResolvedValue({ _raw: JSON.stringify(existingRaw) });
  mockExecute.mockResolvedValue(undefined);
  mockEnqueue.mockResolvedValue(undefined);
});

describe('updateBufalo', () => {
  it('normaliza nivel_maturidade → nivelMaturidade no _raw', async () => {
    await updateBufalo('b1', { nivel_maturidade: 'V', brinco: '001' });
    const raw = JSON.parse(mockExecute.mock.calls[0][1][5]);
    expect(raw.nivelMaturidade).toBe('V');
  });

  it('normaliza id_raca → idRaca no _raw', async () => {
    await updateBufalo('b1', { id_raca: 'raca-new', brinco: '001' });
    const raw = JSON.parse(mockExecute.mock.calls[0][1][5]);
    expect(raw.idRaca).toBe('raca-new');
  });

  it('usa nivelMaturidade novo no SET do SQL', async () => {
    await updateBufalo('b1', { nivel_maturidade: 'T', brinco: '001' });
    // UPDATE bufalos SET brinco=?,sexo=?,nivelMaturidade=?,status=?,idRaca=?,_raw=?,_synced=0,updatedAt=? WHERE id=?
    // índice 2 = nivelMaturidade
    expect(mockExecute.mock.calls[0][1][2]).toBe('T');
  });

  it('usa idRaca novo no SET do SQL', async () => {
    await updateBufalo('b1', { id_raca: 'raca-abc', brinco: '001' });
    // índice 4 = idRaca
    expect(mockExecute.mock.calls[0][1][4]).toBe('raca-abc');
  });
});

describe('getBufaloById', () => {
  it('retorna brinco e nome quando bufalo existe', async () => {
    mockQueryFirst.mockResolvedValueOnce({
      _raw: JSON.stringify({ brinco: 'A001', nome: 'Estrela' }),
    });
    const result = await getBufaloById('uuid-1');
    expect(result).toEqual({ brinco: 'A001', nome: 'Estrela' });
    expect(mockQueryFirst).toHaveBeenCalledWith(
      expect.stringContaining('SELECT _raw FROM bufalos WHERE id = ?'),
      ['uuid-1'],
    );
  });

  it('retorna null quando bufalo não existe', async () => {
    mockQueryFirst.mockResolvedValueOnce(null);
    const result = await getBufaloById('uuid-nao-existe');
    expect(result).toBeNull();
  });

  it('usa nome "Não informado" quando bufalo não tem nome', async () => {
    mockQueryFirst.mockResolvedValueOnce({
      _raw: JSON.stringify({ brinco: 'B002' }),
    });
    const result = await getBufaloById('uuid-2');
    expect(result).toEqual({ brinco: 'B002', nome: 'Não informado' });
  });
});
