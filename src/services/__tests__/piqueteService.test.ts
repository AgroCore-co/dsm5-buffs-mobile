jest.mock('@op-engineering/op-sqlite');
jest.mock('../../database/db');
jest.mock('../pendingOperationsService', () => ({ enqueue: jest.fn() }));
jest.mock('react-native-uuid', () => ({ v4: () => 'lote-uuid' }));

import { queryAll, execute } from '../../database/db';
import { enqueue } from '../pendingOperationsService';
import { piqueteService } from '../piqueteService';

const mockQueryAll = queryAll as jest.Mock;
const mockExecute = execute as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('getAll lê do SQLite e mapeia coords/grupo do _raw', async () => {
  const raw = JSON.stringify({
    idLote: 'l1', nomeLote: 'Piquete 1',
    geoMapa: { type: 'Polygon', coordinates: [[[-47.1, -22.2], [-47.0, -22.1]]] },
    grupo: { idGrupo: 'g1', nomeGrupo: 'Lactantes', color: '#4CAF50' },
  });
  mockQueryAll.mockResolvedValue([{ _raw: raw }]);

  const result = await piqueteService.getAll('prop-1');

  expect(mockQueryAll).toHaveBeenCalledWith(
    expect.stringContaining('FROM lotes WHERE propriedadeId = ?'),
    ['prop-1']
  );
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    id: 'l1', nome: 'Piquete 1', idGrupo: 'g1', grupoNome: 'Lactantes', grupoCor: '#4CAF50',
    coords: [{ latitude: -22.2, longitude: -47.1 }, { latitude: -22.1, longitude: -47.0 }],
  });
});

test('create insere local e enfileira CREATE de lotes', async () => {
  mockExecute.mockResolvedValue(undefined);

  await piqueteService.create({
    nomeLote: 'Novo', idPropriedade: 'prop-1', idGrupo: 'g1',
    tipoLote: 'Pasto', status: 'ativo', qtdMax: 10, areaM2: 100,
    geoMapa: { type: 'Polygon', coordinates: [[[-47.1, -22.2], [-47.0, -22.1]]] },
  });

  expect(mockExecute).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO lotes'),
    expect.arrayContaining(['lote-uuid', 'prop-1', 'g1'])
  );
  expect(mockEnqueue).toHaveBeenCalledWith('lotes', 'CREATE', expect.objectContaining({ id: 'lote-uuid', nomeLote: 'Novo' }));
});

describe('piqueteService.getAll — grupo fallback offline', () => {
  it('usa nomeGrupo da tabela grupos quando _raw não tem grupo.nomeGrupo', async () => {
    (queryAll as jest.Mock).mockImplementation(async (sql: string) => {
      if (sql.includes('FROM lotes')) {
        return [{
          _raw: JSON.stringify({
            id: 'l1', nomeLote: 'P1', idGrupo: 'g1',
            grupo: { idGrupo: 'g1' }, // offline: sem nomeGrupo
            geoMapa: { coordinates: [[[0,0],[1,0],[1,1],[0,0]]] },
          }),
        }];
      }
      if (sql.includes('FROM grupos')) {
        return [{ _raw: JSON.stringify({ idGrupo: 'g1', id: 'g1', nomeGrupo: 'Pastagem A', color: '#FFAA00' }) }];
      }
      return [];
    });

    const piquetes = await piqueteService.getAll('prop1');
    expect(piquetes[0].grupoNome).toBe('Pastagem A');
    expect(piquetes[0].grupoCor).toBe('#FFAA00');
  });
});
