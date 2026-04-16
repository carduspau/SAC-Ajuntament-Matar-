'use client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useRouter } from 'next/navigation';

export interface BarriPoint {
  barri: string;
  lat: number;
  lng: number;
  count: number;
  avg_sentiment: number | null;
}

export function HomeMapInner({ points }: { points: BarriPoint[] }) {
  const router = useRouter();
  const maxCount = points.length > 0 ? Math.max(...points.map((p) => p.count)) : 1;

  function markerColor(avgSentiment: number | null): string {
    if (avgSentiment === null) return '#64748b';
    if (avgSentiment >= 6) return '#10b981';
    if (avgSentiment >= 3.5) return '#f59e0b';
    return '#ef4444';
  }

  return (
    <MapContainer
      center={[41.5381, 2.4449]}
      zoom={13}
      scrollWheelZoom={false}
      zoomControl={false}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {points.map((point) => {
        const radius = 6 + (point.count / maxCount) * 14;
        const color = markerColor(point.avg_sentiment);

        return (
          <CircleMarker
            key={point.barri}
            center={[point.lat, point.lng]}
            radius={radius}
            pathOptions={{
              color: '#ffffff',
              weight: 1,
              fillColor: color,
              fillOpacity: 0.75,
            }}
            eventHandlers={{
              click: () => router.push('/mapa'),
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-semibold">{point.barri}</p>
                <p>{point.count} missatges</p>
                {point.avg_sentiment !== null && (
                  <p>
                    Sentiment:{' '}
                    <span className="font-medium">
                      {(point.avg_sentiment / 10).toFixed(2)}
                    </span>
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
