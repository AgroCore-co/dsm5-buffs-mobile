jest.mock('../../database/db');
jest.mock('../pendingOperationsService');
jest.mock('react-native-uuid', () => ({ v4: () => 'mock-uuid-san' }));

import { execute } from '../../database/db';
import { enqueue } from '../pendingOperationsService';
import { sanitarioService } from '../sanitarioService';

const mockExecute = execute as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('sanitarioService.add', () => {
  test('INSERT recebe bufaloId correto quando form envia id_bufalo', async () => {
    await sanitarioService.add({
      id_bufalo: 'bufalo-99',
      id_propriedade: 'prop-1',
      id_medicao: 'med-1',
      dt_aplicacao: '2026-01-15',
      dosagem: 5,
      tipo: 'Vacina',
    });

    const [, params] = mockExecute.mock.calls[0];
    // params[1] é bufaloId na posição do INSERT
    expect(params[1]).toBe('bufalo-99');
  });

  test('enqueue recebe idBufalo camelCase correto', async () => {
    await sanitarioService.add({
      id_bufalo: 'bufalo-99',
      id_propriedade: 'prop-1',
      id_medicao: 'med-1',
      dt_aplicacao: '2026-01-15',
      dosagem: 5,
      tipo: 'Vacina',
    });

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.idBufalo).toBe('bufalo-99');
  });

  test('idMedicao normalizado de id_medicao', async () => {
    await sanitarioService.add({
      id_bufalo: 'bufalo-1',
      id_propriedade: 'prop-1',
      id_medicao: 'med-42',
      dt_aplicacao: '2026-01-15',
      dosagem: 2,
      tipo: 'Tratamento',
    });

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.idMedicao).toBe('med-42');
  });

  test('dtAplicacao normalizado de dt_aplicacao', async () => {
    await sanitarioService.add({
      id_bufalo: 'bufalo-1',
      id_propriedade: 'prop-1',
      id_medicao: 'med-1',
      dt_aplicacao: '2026-03-20',
      dosagem: 1,
      tipo: 'Vacina',
    });

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.dtAplicacao).toBe('2026-03-20');
  });

  test('dtRetorno normalizado de dt_retorno', async () => {
    await sanitarioService.add({
      id_bufalo: 'bufalo-1',
      id_propriedade: 'prop-1',
      id_medicao: 'med-1',
      dt_aplicacao: '2026-03-20',
      dt_retorno: '2026-03-30',
      dosagem: 1,
      tipo: 'Tratamento',
    });

    const [, , payload] = mockEnqueue.mock.calls[0];
    expect(payload.dtRetorno).toBe('2026-03-30');
  });
});
