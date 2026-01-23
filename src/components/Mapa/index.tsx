import React, { useEffect, useMemo, useRef } from 'react';
import { WebView } from 'react-native-webview';

interface Coords {
  latitude: number;
  longitude: number;
}

interface Piquete {
  id: string;
  coords: { latitude: number; longitude: number }[];
  color: string;
}

interface MapLeafletProps {
  piquetes: Piquete[];
  currentLocation: Coords | null;
}

const CUSTOM_MARKER_ICON_BASE64 = "data:image/png;base64,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";

export const MapLeaflet: React.FC<MapLeafletProps> = ({ piquetes, currentLocation }) => {
  const webviewRef = useRef<WebView>(null);

  const htmlContent = useMemo(() => {
    const piquetesJS = piquetes.map(
      p => `{
        coords: [${p.coords.map(c => `[${c.latitude}, ${c.longitude}]`).join(',')}],
        color: '${p.color}'
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
            #map { height: 100%; width: 100%; }
            html, body { margin: 0; height: 100%; width: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
            <script>
            const piquetes = [${piquetesJS}];
            const map = L.map('map');
            let accuracyCircle = null;
            let accuracy = 10;
            let currentMarker = null;

            let allCoords = [];
            piquetes.forEach(p => {
              L.polygon(p.coords, { color: p.color, fillOpacity: 0.3 }).addTo(map);
              allCoords = allCoords.concat(p.coords);
            });

            const fallbackCenter = [-15, -48]; 
            const fallbackZoom = 4;
            let isViewSet = false; 
            
            window.updateCurrentLocation = function(lat, lng) {
                const newLatLng = L.latLng(lat, lng);

                if (currentMarker) {
                    currentMarker.setLatLng(newLatLng);
                    if (accuracyCircle) accuracyCircle.setLatLng(newLatLng).setRadius(accuracy);
                } else {
                    accuracyCircle = L.circle(newLatLng, {
                        radius: accuracy,      // metros de precisão
                        color: '#30f',
                        fillColor: '#30f',
                        fillOpacity: 0.2,
                        weight: 1
                    }).addTo(map);
                    currentMarker = L.circleMarker(newLatLng, {
                        radius: 8,
                        color: '#3388ff',
                        fillColor: '#3388ff',
                        fillOpacity: 1
                    }).addTo(map);
                    map.setView(newLatLng, 16); 
                }
            }

            if (allCoords.length > 0) {
              map.fitBounds(L.latLngBounds(allCoords));
              isViewSet = true;
            }

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            if (!isViewSet) {
                 map.setView(fallbackCenter, fallbackZoom);
            }
            
            map.invalidateSize(); 
          </script>
        </body>  
      </html>  
    `;
  }, [piquetes]);

  useEffect(() => {
      if (webviewRef.current && currentLocation) {
        const { latitude, longitude } = currentLocation;
        
        const jsCode = `
          updateCurrentLocation(${latitude}, ${longitude});
          true;
        `;

        webviewRef.current.injectJavaScript(jsCode);
      }
    }, [currentLocation]); 
  
  return <WebView ref={webviewRef} originWhitelist={['*']} source={{ html: htmlContent }} style={{ height: 690, width: '100%' }} />;
};

