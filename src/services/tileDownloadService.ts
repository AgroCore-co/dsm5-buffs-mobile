/**
 * tileDownloadService
 *
 * Baixa tiles de satélite Esri (zoom 14-18) para o bounding box dos
 * piquetes de uma propriedade e armazena no SQLite local como base64.
 *
 * Sem dependências de sistema de arquivos — usa fetch() + op-sqlite,
 * compatível com React Native New Architecture.
 *
 * Estrutura de lookup: offline_tiles (propriedadeId, z, x, y) → data (data URI)
 * Metadados: offline_tiles_meta (propriedadeId) → downloadedAt, bbox, etc.
 */

import { queryAll, queryFirst, execute } from '../database/db';

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

/** Esri World Imagery: atenção à ordem z/y/x (diferente do padrão z/x/y) */
const ESRI_TILE_URL = (z: number, y: number, x: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

const ZOOM_MIN = 14;
const ZOOM_MAX = 18;
/** Buffer em graus (~1 km de margem ao redor do bbox dos piquetes) */
const BBOX_BUFFER_DEG = 0.01;
/** Número de downloads simultâneos */
const CONCURRENCY = 6;

// ─────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────

export interface TileBBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface TileDownloadProgress {
  downloaded: number;
  total: number;
}

export interface TileMetadata {
  propriedadeId: string;
  downloadedAt: string;
  bbox: TileBBox;
  zoomMin: number;
  zoomMax: number;
  totalTiles: number;
}

// ─────────────────────────────────────────────────────────────
// Coordenadas geográficas → índice de tile (padrão OSM/Leaflet)
// ─────────────────────────────────────────────────────────────

function lngToTileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, z));
}

function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
      Math.pow(2, z),
  );
}

// ─────────────────────────────────────────────────────────────
// Lê bbox dos piquetes da propriedade no SQLite local
// ─────────────────────────────────────────────────────────────

export async function getBBoxForProp(
  propriedadeId: string,
): Promise<TileBBox | null> {
  const rows = await queryAll<{ _raw: string }>(
    `SELECT _raw FROM lotes WHERE propriedadeId = ? AND deletedAt IS NULL`,
    [propriedadeId],
  );

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  let hasCoords = false;

  for (const row of rows) {
    try {
      const item = JSON.parse(row._raw);
      const coordinates: number[][][] | undefined = item.geoMapa?.coordinates;
      if (!coordinates?.[0]) continue;
      for (const [lng, lat] of coordinates[0]) {
        if (typeof lat !== 'number' || typeof lng !== 'number') continue;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        hasCoords = true;
      }
    } catch { /* piquete com JSON inválido — ignora */ }
  }

  return hasCoords ? { minLat, maxLat, minLng, maxLng } : null;
}

// ─────────────────────────────────────────────────────────────
// Contagem de tiles (para estimativa antes do download)
// ─────────────────────────────────────────────────────────────

function countTilesForBBox(bbox: TileBBox): number {
  let total = 0;
  const b = BBOX_BUFFER_DEG;
  for (let z = ZOOM_MIN; z <= ZOOM_MAX; z++) {
    const x0 = lngToTileX(bbox.minLng - b, z);
    const x1 = lngToTileX(bbox.maxLng + b, z);
    const y0 = latToTileY(bbox.maxLat + b, z); // y cresce para sul
    const y1 = latToTileY(bbox.minLat - b, z);
    total += (x1 - x0 + 1) * (y1 - y0 + 1);
  }
  return total;
}

export async function estimateTileCount(
  propriedadeId: string,
): Promise<number | null> {
  const bbox = await getBBoxForProp(propriedadeId);
  return bbox ? countTilesForBBox(bbox) : null;
}

// ─────────────────────────────────────────────────────────────
// Estado dos tiles em cache
// ─────────────────────────────────────────────────────────────

export async function hasCachedTiles(propriedadeId: string): Promise<boolean> {
  const row = await queryFirst<{ propriedadeId: string }>(
    `SELECT propriedadeId FROM offline_tiles_meta WHERE propriedadeId = ?`,
    [propriedadeId],
  );
  return row !== null;
}

export async function getTilesMeta(
  propriedadeId: string,
): Promise<TileMetadata | null> {
  const row = await queryFirst<{
    downloadedAt: string;
    zoomMin: number;
    zoomMax: number;
    totalTiles: number;
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }>(
    `SELECT downloadedAt, zoomMin, zoomMax, totalTiles, minLat, maxLat, minLng, maxLng
     FROM offline_tiles_meta WHERE propriedadeId = ?`,
    [propriedadeId],
  );

  if (!row) return null;

  return {
    propriedadeId,
    downloadedAt: row.downloadedAt,
    bbox: { minLat: row.minLat, maxLat: row.maxLat, minLng: row.minLng, maxLng: row.maxLng },
    zoomMin: row.zoomMin,
    zoomMax: row.zoomMax,
    totalTiles: row.totalTiles,
  };
}

export async function deleteCachedTiles(propriedadeId: string): Promise<void> {
  await execute(`DELETE FROM offline_tiles WHERE propriedadeId = ?`, [propriedadeId]);
  await execute(`DELETE FROM offline_tiles_meta WHERE propriedadeId = ?`, [propriedadeId]);
}

// ─────────────────────────────────────────────────────────────
// Leitura de tile individual (para servir ao MapLeaflet)
// ─────────────────────────────────────────────────────────────

export async function getTileDataUri(
  propriedadeId: string,
  z: number,
  x: number,
  y: number,
): Promise<string | null> {
  const row = await queryFirst<{ data: string }>(
    `SELECT data FROM offline_tiles
     WHERE propriedadeId = ? AND z = ? AND x = ? AND y = ?`,
    [propriedadeId, z, x, y],
  );
  return row?.data ?? null;
}

// ─────────────────────────────────────────────────────────────
// Conversão ArrayBuffer → data URI base64
// ─────────────────────────────────────────────────────────────

async function fetchTileAsDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Constrói string binária em loop para evitar stack overflow com spread
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

// ─────────────────────────────────────────────────────────────
// Download principal
// ─────────────────────────────────────────────────────────────

/**
 * Baixa tiles Esri zoom 14-18 para o bbox dos piquetes da propriedade.
 * Armazena no SQLite. Tiles já existentes são pulados (retry-safe).
 *
 * @param propriedadeId  UUID da propriedade
 * @param onProgress     Callback chamado a cada tile processado
 * @param signal         AbortSignal opcional para cancelar
 */
export async function downloadTilesForProp(
  propriedadeId: string,
  onProgress: (p: TileDownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const bbox = await getBBoxForProp(propriedadeId);
  if (!bbox) {
    throw new Error('Nenhum piquete com geometria encontrado para esta propriedade.');
  }

  const total = countTilesForBBox(bbox);
  let downloaded = 0;

  type TileCoord = { z: number; x: number; y: number };
  const queue: TileCoord[] = [];
  const b = BBOX_BUFFER_DEG;

  for (let z = ZOOM_MIN; z <= ZOOM_MAX; z++) {
    const x0 = lngToTileX(bbox.minLng - b, z);
    const x1 = lngToTileX(bbox.maxLng + b, z);
    const y0 = latToTileY(bbox.maxLat + b, z);
    const y1 = latToTileY(bbox.minLat - b, z);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        queue.push({ z, x, y });
      }
    }
  }

  const downloadOne = async ({ z, x, y }: TileCoord): Promise<void> => {
    if (signal?.aborted) return;

    // Pula se já existe
    const existing = await queryFirst<{ propriedadeId: string }>(
      `SELECT propriedadeId FROM offline_tiles
       WHERE propriedadeId = ? AND z = ? AND x = ? AND y = ?`,
      [propriedadeId, z, x, y],
    );

    if (!existing) {
      const url = ESRI_TILE_URL(z, y, x); // Esri: z/y/x na URL
      const dataUri = await fetchTileAsDataUri(url);
      await execute(
        `INSERT OR REPLACE INTO offline_tiles (propriedadeId, z, x, y, data)
         VALUES (?, ?, ?, ?, ?)`,
        [propriedadeId, z, x, y, dataUri],
      );
    }

    downloaded++;
    onProgress({ downloaded, total });
  };

  // Executa com concorrência limitada
  let index = 0;
  const worker = async () => {
    while (index < queue.length) {
      if (signal?.aborted) return;
      const tile = queue[index++];
      await downloadOne(tile);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  if (signal?.aborted) {
    throw new DOMException('Download cancelado', 'AbortError');
  }

  // Salva / atualiza metadados
  await execute(
    `INSERT OR REPLACE INTO offline_tiles_meta
     (propriedadeId, downloadedAt, zoomMin, zoomMax, totalTiles,
      minLat, maxLat, minLng, maxLng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      propriedadeId,
      new Date().toISOString(),
      ZOOM_MIN,
      ZOOM_MAX,
      total,
      bbox.minLat,
      bbox.maxLat,
      bbox.minLng,
      bbox.maxLng,
    ],
  );
}
