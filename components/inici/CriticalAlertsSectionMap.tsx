'use client';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import { parseSentiment } from '@/lib/sentiment';
import type { SacMessage } from '@/types';

function SizeInvalidator() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 0);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [map]);
  return null;
}

const MATARO: [number, number] = [41.5381, 2.4449];

interface Props {
  points: SacMessage[];
  onSelect?: (m: SacMessage) => void;
}

export function CriticalAlertsSectionMap({ points, onSelect }: Props) {
  return (
    <MapContainer
      center={MATARO}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <SizeInvalidator />
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
            center={[point.lat!, point.lng!]}
            radius={score !== null && score < 2.5 ? 9 : 7}
            pathOptions={{
              color: '#ffffff',
              weight: 1.5,
              fillColor: color,
              fillOpacity: 0.85,
            }}
            eventHandlers={onSelect ? { click: () => onSelect(point) } : undefined}
          />
        );
      })}
    </MapContainer>
  );
}
