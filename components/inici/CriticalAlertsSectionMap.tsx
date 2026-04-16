'use client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { parseSentiment } from '@/lib/sentiment';

export interface CritPoint {
  id: number;
  lat: number;
  lng: number;
  barri: string | null;
  sentiment: string | null;
  clas1: string | null;
}

export function CriticalAlertsSectionMap({ points }: { points: CritPoint[] }) {
  const center: [number, number] =
    points.length > 0
      ? [
          points.reduce((sum, p) => sum + p.lat, 0) / points.length,
          points.reduce((sum, p) => sum + p.lng, 0) / points.length,
        ]
      : [41.5381, 2.4449];

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {points.map((point) => {
        const score = parseSentiment(point.sentiment);
        const color = score !== null && score < 2.5 ? '#dc2626' : '#f97316';
        return (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={7}
            pathOptions={{
              color: '#ffffff',
              weight: 1.5,
              fillColor: color,
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                {point.barri && (
                  <p className="font-semibold">{point.barri}</p>
                )}
                {point.clas1 && (
                  <p className="text-gray-600">{point.clas1}</p>
                )}
                {score !== null && (
                  <p>
                    Sentiment:{' '}
                    <span className="font-medium">{(score / 10).toFixed(2)}</span>
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
