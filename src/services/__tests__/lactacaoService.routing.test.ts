jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));
jest.mock('@op-engineering/op-sqlite');
jest.mock('../../database/db');
jest.mock('../../lib/apiClient');
jest.mock('../pendingOperationsService');

import { enqueue } from '../pendingOperationsService';
import { registrarColetaApi, registrarEstoqueApi } from '../lactacaoService';

const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('registrarColetaApi enfileira em "retiradas" (não em ciclos_lactacao)', async () => {
  mockEnqueue.mockResolvedValue(undefined);
  await registrarColetaApi({
    idIndustria: 'ind-1',
    idPropriedade: 'prop-1',
    resultadoTeste: true,
    quantidade: 50,
    dtColeta: '2026-05-21',
  });
  expect(mockEnqueue).toHaveBeenCalledWith('retiradas', 'CREATE', expect.objectContaining({
    idIndustria: 'ind-1',
    idPropriedade: 'prop-1',
    quantidade: 50,
  }));
  const [entity] = mockEnqueue.mock.calls[0];
  expect(entity).not.toBe('ciclos_lactacao');
});

test('registrarEstoqueApi enfileira em "producao_diaria" (não em ciclos_lactacao)', async () => {
  mockEnqueue.mockResolvedValue(undefined);
  await registrarEstoqueApi({
    id_propriedade: 'prop-1',
    id_usuario: 'usr-1',
    quantidade: 100,
    dt_registro: '2026-05-21',
    observacao: 'ok',
  });
  expect(mockEnqueue).toHaveBeenCalledWith('producao_diaria', 'CREATE', expect.objectContaining({
    idPropriedade: 'prop-1',
    quantidade: 100,
  }));
  const [entity] = mockEnqueue.mock.calls[0];
  expect(entity).not.toBe('ciclos_lactacao');
});

test('registrarEstoqueApi adapta snake_case → camelCase e remove id_usuario', async () => {
  mockEnqueue.mockResolvedValue(undefined);
  await registrarEstoqueApi({
    id_propriedade: 'prop-1',
    id_usuario: 'usr-1',
    quantidade: 80,
    dt_registro: '2026-05-20',
  });
  const [, , payload] = mockEnqueue.mock.calls[0];
  expect(payload).toHaveProperty('idPropriedade', 'prop-1');
  expect(payload).toHaveProperty('dtRegistro', '2026-05-20');
  expect(payload).not.toHaveProperty('id_usuario');
  expect(payload).not.toHaveProperty('id_propriedade');
  expect(payload).not.toHaveProperty('dt_registro');
});
