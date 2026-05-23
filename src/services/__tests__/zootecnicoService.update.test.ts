// src/services/__tests__/zootecnicoService.update.test.ts
import { zootecService } from '../zootecnicoService';
import { queryFirst, execute } from '../../database/db';
import { enqueue } from '../pendingOperationsService';

jest.mock('../../database/db');
jest.mock('../pendingOperationsService');

const mockExecute = execute as jest.Mock;
const mockQueryFirst = queryFirst as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryFirst.mockResolvedValue({
    _raw: JSON.stringify({ id: 'z1', bufaloId: 'b1', peso: 300, corPelagem: 'parda' }),
  });
  mockExecute.mockResolvedValue(undefined);
  mockEnqueue.mockResolvedValue(undefined);
});

describe('zootecService.update', () => {
  it('armazena corPelagem em camelCase no _raw', async () => {
    await zootecService.update('z1', { corPelagem: 'preta' });
    const raw = JSON.parse(mockExecute.mock.calls[0][1][0]);
    expect(raw.corPelagem).toBe('preta');
    expect(raw.cor_pelagem).toBeUndefined();
  });

  it('armazena condicaoCorporal em camelCase no _raw', async () => {
    await zootecService.update('z1', { condicaoCorporal: 4 });
    const raw = JSON.parse(mockExecute.mock.calls[0][1][0]);
    expect(raw.condicaoCorporal).toBe(4);
    expect(raw.condicao_corporal).toBeUndefined();
  });

  it('enfileira payload camelCase', async () => {
    await zootecService.update('z1', { porteCorporal: 'Grande' });
    const enqueuedPayload = mockEnqueue.mock.calls[0][2];
    expect(enqueuedPayload.porteCorporal).toBe('Grande');
    expect(enqueuedPayload.porte_corporal).toBeUndefined();
  });
});
