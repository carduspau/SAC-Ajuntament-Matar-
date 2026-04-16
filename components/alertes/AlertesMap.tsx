'use client';

import React from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import type { SacMessage } from '@/types';
import { parseSentiment } from '@/lib/sentiment';

interface Props {
  alerts: SacMessage[];
  onSelect?: (m: SacMessage) => void;
}

function severityColor(score: number | null): string {
  if (score === null) return '#64748b';
  if (score < 2.5) return '#dc2626';
  return '#f97316';
}

export function AlertesMap({ alerts, onSelect }: Props) {
  const withCoords = alerts.filter(a => a.lat !== null && a.lng !== null);

  const center: [number, number] = withCoords.length > 0
    ? [
        withCoords.reduce((s, a) => s + a.lat!, 0) / withCoords.length,
        withCoords.reduce((s, a) => s + a.lng!, 0) / withCoords.length,
      ]
    : [41.5381, 2.4449];

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
            eventHandlers={onSelect ? { click: () => onSelect(alert) } : undefined}
          />
        );
      })}
    </MapContainer>
  );
}
