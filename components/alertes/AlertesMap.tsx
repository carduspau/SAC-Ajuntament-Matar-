'use client';

import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { SacMessage } from '@/types';
import { parseSentiment } from '@/lib/sentiment';
import { formatDate } from '@/lib/utils';

interface Props {
  alerts: SacMessage[];
}

function severityColor(score: number | null): string {
  if (score === null) return '#64748b';
  if (score < 2.5) return '#dc2626'; // red-600
  return '#f97316'; // orange-500
}

export function AlertesMap({ alerts }: Props) {
  const withCoords = alerts.filter(a => a.lat !== null && a.lng !== null);

  const center: [number, number] = withCoords.length > 0
    ? [
        withCoords.reduce((s, a) => s + a.lat!, 0) / withCoords.length,
        withCoords.reduce((s, a) => s + a.lng!, 0) / withCoords.length,
      ]
    : [41.5381, 2.4449]; // Mataró default

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {withCoords.map(alert => {
        const score = parseSentiment(alert.sentiment);
        const color = severityColor(score);
        return (
          <CircleMarker
            key={alert.id}
            center={[alert.lat!, alert.lng!]}
            radius={score !== null && score < 2.5 ? 9 : 7}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.85,
              color: '#fff',
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-foreground">{alert.barri ?? '—'}</div>
                <div className="text-muted-foreground">{formatDate(alert.data_inici, 'dd/MM/yyyy')}</div>
                {alert.clas1 && <div className="text-muted-foreground-1">{alert.clas1}</div>}
                {score !== null && (
                  <div style={{ color }} className="font-bold">
                    Sentiment: {score.toFixed(1)}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
