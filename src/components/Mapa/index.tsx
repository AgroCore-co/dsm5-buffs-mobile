import React, { useEffect, useMemo, useRef } from 'react';
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
}

export const MapLeaflet = React.forwardRef<WebView, MapLeafletProps>(({ piquetes, currentLocation, onMapMessage }, ref) => {
  const htmlContent = useMemo(() => {
    const piquetesJS = piquetes.map(
      p => `{
        coords: [${p.coords.map(c => `[${c.latitude}, ${c.longitude}]`).join(',')}],
        color: '${p.color}',
        nome: '${p.nome || ''}',
        fillOpacity: ${p.fillOpacity ?? 0.15},
        weight: ${p.weight ?? 2}
      }`
    ).join(',');

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

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

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

              const match = (p.nome || '').match(/\d+/);
              const shortName = p.nome
                ? p.nome.replace(/(\d+)/, '<br/>$1')
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
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MAP_READY'
              }));
            });

            window.getCenter = function() {
              const center = map.getCenter();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'CENTER',
                data: {
                  latitude: center.lat,
                  longitude: center.lng
                }
              }));
            }

            window.updatePolyline = function(coords, previewPoint) {
              if (previewPolyline) {
                map.removeLayer(previewPolyline);
              }

              const fullCoords = [...coords];

              if (previewPoint) {
                fullCoords.push(previewPoint);
              }

              if (fullCoords.length > 1) {
                previewPolyline = L.polyline(
                  fullCoords.map(c => [c.latitude, c.longitude]),
                  { color: 'blue', dashArray: '5,5' }
                ).addTo(map);
              }
            }

            if (piquetes.length > 0) {
              const allCoords = piquetes.flatMap(p => p.coords);

              if (allCoords.length > 0) {
                const bounds = L.latLngBounds(
                  allCoords.map(c => [c[0], c[1]])
                );

                map.fitBounds(bounds, { padding: [50, 50] });
              }
            }

            window.drawPiquetes = function(piquetes, isClosed) {
              if (window.polygonLayer) {
                window.polygonLayer.forEach(p => map.removeLayer(p));
              }

              window.polygonLayer = [];

              piquetes.forEach(p => {
                L.polygon(p.coords, { color: p.color }).addTo(map);
                const latlngs = p.coords.map(c => [c.latitude, c.longitude]);
              
                if (latlngs.length >= 2) {
                  const polyline = L.polyline(latlngs, {
                    color: p.color,
                    weight: 3
                  }).addTo(map);

                  window.polygonLayer.push(polyline);
                }

                if (latlngs.length >= 3 && isClosed) {
                  const closedCoords = [...latlngs, latlngs[0]];

                  const polygon = L.polygon(closedCoords, {
                    color: p.color,
                    fillColor: p.color,
                    fillOpacity: 0.3
                  }).addTo(map);

                  window.polygonLayer.push(polygon);
                }
              });
            };
            if (!piquetes.length && currentLocation)

            map.on('move', function() {
              const center = map.getCenter();

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MOVE',
                data: {
                  latitude: center.lat,
                  longitude: center.lng
                }
              }));
            });

            function getPolygonCenter(coords) {
              let latSum = 0;
              let lngSum = 0;

              coords.forEach(c => {
                latSum += c[0];
                lngSum += c[1];
              });

              return [
                latSum / coords.length,
                lngSum / coords.length
              ];
            }
            updateLabelsVisibility();
            map.on('zoomend', updateLabelsVisibility);
          </script>
        </body>
      </html>
    `;
  }, [piquetes]);

  const handleMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    onMapMessage && onMapMessage(data);
  };

  useEffect(() => {
    if ((ref as any)?.current && currentLocation) {
      (ref as any)?.current?.injectJavaScript(`
        map.setView([${currentLocation.latitude}, ${currentLocation.longitude}], 16);
        true;
      `);
    }
  }, [currentLocation]);

  useEffect(() => {
    if ((ref as any)?.current) {
      (ref as any)?.current?.injectJavaScript(`
        window.updatePolyline(${JSON.stringify(piquetes[0]?.coords || [])});
        true;
      `);
    }
  }, [piquetes]);

  return (
    <WebView
      ref={ref}
      nestedScrollEnabled
      originWhitelist={['*']}
      source={{ html: htmlContent }}
      onMessage={handleMessage}
      style={{ height: 690 }}
    />
  );
});