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
        nome: '${p.nome || ''}'
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
          </style>
        </head>
        <body>
          <div id="map"></div>

          <script>
            const map = L.map('map').setView([-15, -48], 4);
            let previewPolyline = null;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

            const piquetes = [${piquetesJS}];

            piquetes.forEach(p => {
              L.polygon(p.coords, { color: p.color }).addTo(map);
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