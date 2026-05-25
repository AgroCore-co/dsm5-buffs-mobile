import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { WebView } from 'react-native-webview';

interface Coords {
  latitude: number;
  longitude: number;
}

interface Piquete {
  nome: string;
  id: string;
  coords: { latitude: number; longitude: number }[];
  color: string;
  fillOpacity?: number;
  weight?: number;
}

interface MapLeafletProps {
  piquetes: Piquete[];
  currentLocation: Coords | null;
  onMapMessage?: (data: any) => void;
  /**
   * Quando fornecida, o Leaflet usa uma camada offline customizada que pede
   * tiles via mensagem (TILE_REQUEST) ao invés de buscar no CDN.
   * Deve estar definida apenas quando isOffline=true e tiles estão no SQLite.
   */
  getTile?: (z: number, x: number, y: number) => Promise<string | null>;
  isOffline?: boolean;
}

export const MapLeaflet = React.forwardRef<WebView, MapLeafletProps>(
  ({ piquetes, currentLocation, onMapMessage, getTile, isOffline }, externalRef) => {
    const useOfflineTiles = isOffline && typeof getTile === 'function';

    // Ref interno para injetar JS (resposta de tiles). O externalRef é repassado
    // para quem precisar controlar o WebView de fora (scroll, zoom, etc.).
    const internalRef = useRef<WebView>(null);

    const mergedRef = useCallback(
      (instance: WebView | null) => {
        (internalRef as React.MutableRefObject<WebView | null>).current = instance;
        if (typeof externalRef === 'function') {
          externalRef(instance);
        } else if (externalRef && 'current' in externalRef) {
          (externalRef as React.MutableRefObject<WebView | null>).current = instance;
        }
      },
      [externalRef],
    );

    const htmlContent = useMemo(() => {
      const piquetesJS = piquetes
        .map(
          p => `{
            coords: [${p.coords.map(c => `[${c.latitude}, ${c.longitude}]`).join(',')}],
            color: '${p.color}',
            nome: '${p.nome || ''}',
            fillOpacity: ${p.fillOpacity ?? 0.15},
            weight: ${p.weight ?? 2}
          }`,
        )
        .join(',');

      // Tile layer: online → Esri CDN (z/y/x); offline → camada customizada com bridge
      const tileLayerJS = useOfflineTiles
        ? `
          // ── Camada offline via bridge RN ──────────────────────────
          var _tileCallbacks = {};

          window.receiveTile = function(reqId, dataUri) {
            var cb = _tileCallbacks[reqId];
            if (cb) { cb(dataUri); delete _tileCallbacks[reqId]; }
          };

          var OfflineTileLayer = L.TileLayer.extend({
            createTile: function(coords, done) {
              var img = document.createElement('img');
              var reqId = coords.z + '_' + coords.x + '_' + coords.y;

              _tileCallbacks[reqId] = function(dataUri) {
                img.src = dataUri
                  ? dataUri
                  // pixel transparente como fallback
                  : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                done(null, img);
              };

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TILE_REQUEST',
                reqId: reqId,
                z: coords.z,
                x: coords.x,
                y: coords.y
              }));

              // Timeout de segurança: 8 s
              setTimeout(function() {
                if (_tileCallbacks[reqId]) {
                  _tileCallbacks[reqId](null);
                  delete _tileCallbacks[reqId];
                }
              }, 8000);

              return img;
            }
          });

          new OfflineTileLayer('', { maxZoom: 18, attribution: 'Mapa offline' }).addTo(map);
        `
        : `
          L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            { maxZoom: 19, attribution: 'Tiles © Esri' }
          ).addTo(map);
        `;

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
            <style>
              html, body, #map { height: 100%; margin: 0; }
              .piquete-label {
                color: #fff;
                font-weight: 800;
                font-size: 9px;
                text-align: center;
                text-shadow: 3px 3px 3px rgba(0,0,0,0.8);
              }
            </style>
          </head>
          <body>
            <div id="map"></div>
            <script>
              const map = L.map('map').setView([-15, -48], 4);
              const ZOOM_MOSTRAR_PIQUETES = 16;
              let previewPolyline = null;

              ${tileLayerJS}

              const piquetes = [${piquetesJS}];
              const labelMarkers = [];
              let labelsCreated = false;

              function updateLabelsVisibility() {
                const zoom = map.getZoom();
                if (zoom >= ZOOM_MOSTRAR_PIQUETES) {
                  if (!labelsCreated) {
                    labelMarkers.forEach(label => label.addTo(map));
                    labelsCreated = true;
                  }
                } else {
                  if (labelsCreated) {
                    labelMarkers.forEach(label => map.removeLayer(label));
                    labelsCreated = false;
                  }
                }
              }

              piquetes.forEach((p, index) => {
                const polygon = L.polygon(p.coords, {
                  color: p.color,
                  fillColor: p.color,
                  fillOpacity: p.fillOpacity ?? 0.15,
                  weight: p.weight ?? 2,
                }).addTo(map);

                const shortName = p.nome
                  ? p.nome.replace(/(\\d+)/, '<br/>$1')
                  : 'P' + (index + 1);

                const center = getPolygonCenter(p.coords);
                const label = L.marker(center, {
                  icon: L.divIcon({
                    className: 'piquete-label',
                    html: shortName,
                    iconSize: [40, 30]
                  })
                });
                labelMarkers.push(label);
              });

              map.whenReady(function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
              });

              window.getCenter = function() {
                const center = map.getCenter();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'CENTER',
                  data: { latitude: center.lat, longitude: center.lng }
                }));
              };

              window.updatePolyline = function(coords, previewPoint) {
                if (previewPolyline) map.removeLayer(previewPolyline);
                const fullCoords = [...coords];
                if (previewPoint) fullCoords.push(previewPoint);
                if (fullCoords.length > 1) {
                  previewPolyline = L.polyline(
                    fullCoords.map(c => [c.latitude, c.longitude]),
                    { color: 'blue', dashArray: '5,5' }
                  ).addTo(map);
                }
              };

              if (piquetes.length > 0) {
                const allCoords = piquetes.flatMap(p => p.coords);
                if (allCoords.length > 0) {
                  const bounds = L.latLngBounds(allCoords.map(c => [c[0], c[1]]));
                  map.fitBounds(bounds, { padding: [50, 50] });
                }
              }

              window.drawPiquetes = function(piquetes, isClosed) {
                if (window.polygonLayer) window.polygonLayer.forEach(p => map.removeLayer(p));
                window.polygonLayer = [];
                piquetes.forEach(p => {
                  L.polygon(p.coords, { color: p.color }).addTo(map);
                  const latlngs = p.coords.map(c => [c.latitude, c.longitude]);
                  if (latlngs.length >= 2) {
                    const polyline = L.polyline(latlngs, { color: p.color, weight: 3 }).addTo(map);
                    window.polygonLayer.push(polyline);
                  }
                  if (latlngs.length >= 3 && isClosed) {
                    const closedCoords = [...latlngs, latlngs[0]];
                    const polygon = L.polygon(closedCoords, {
                      color: p.color, fillColor: p.color, fillOpacity: 0.3
                    }).addTo(map);
                    window.polygonLayer.push(polygon);
                  }
                });
              };

              map.on('move', function() {
                const center = map.getCenter();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'MOVE',
                  data: { latitude: center.lat, longitude: center.lng }
                }));
              });

              function getPolygonCenter(coords) {
                let latSum = 0, lngSum = 0;
                coords.forEach(c => { latSum += c[0]; lngSum += c[1]; });
                return [latSum / coords.length, lngSum / coords.length];
              }

              updateLabelsVisibility();
              map.on('zoomend', updateLabelsVisibility);
            </script>
          </body>
        </html>
      `;
    }, [piquetes, useOfflineTiles]);

    // Handler de mensagens: roteia TILE_REQUEST para o getTile callback
    const handleMessage = useCallback(
      async (event: any) => {
        let data: any;
        try {
          data = JSON.parse(event.nativeEvent.data);
        } catch {
          return;
        }

        if (data.type === 'TILE_REQUEST' && getTile) {
          const { reqId, z, x, y } = data;
          try {
            const dataUri = await getTile(z, x, y);
            const safe = dataUri ? dataUri.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
            internalRef.current?.injectJavaScript(
              `window.receiveTile('${reqId}', ${dataUri ? `'${safe}'` : 'null'}); true;`,
            );
          } catch {
            internalRef.current?.injectJavaScript(
              `window.receiveTile('${reqId}', null); true;`,
            );
          }
          return;
        }

        onMapMessage?.(data);
      },
      [getTile, onMapMessage],
    );

    useEffect(() => {
      if (internalRef.current && currentLocation) {
        internalRef.current.injectJavaScript(`
          map.setView([${currentLocation.latitude}, ${currentLocation.longitude}], 16);
          true;
        `);
      }
    }, [currentLocation]);

    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.injectJavaScript(`
          window.updatePolyline(${JSON.stringify(piquetes[0]?.coords || [])});
          true;
        `);
      }
    }, [piquetes]);

    return (
      <WebView
        ref={mergedRef}
        nestedScrollEnabled
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        style={{ height: 690 }}
      />
    );
  },
);
