'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer as LeafletMap, TileLayer, GeoJSON, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection } from 'geojson';
import type { BarriStat, SacMessage } from '@/types';
import { countToMapColor, sentimentMapColor } from '@/lib/sentiment';
import { truncate } from '@/lib/utils';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface Props {
  mode: 'choropleth' | 'cluster';
  geojson: FeatureCollection;
  barriStats: BarriStat[];
  messages: SacMessage[];
  colorBy: 'count' | 'sentiment';
}

function ChoroplethLayer({ geojson, barriStats, colorBy }: Omit<Props, 'mode' | 'messages'>) {
  const maxCount = Math.max(...barriStats.map(b => b.count), 1);
  const byBarri = Object.fromEntries(barriStats.map(b => [b.barri, b]));

  function normalizeBarri(name: string): string {
    return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function findStat(featureName: string): BarriStat | undefined {
    const norm = normalizeBarri(featureName);
    return barriStats.find(b => normalizeBarri(b.barri) === norm)
        || barriStats.find(b => normalizeBarri(b.barri).includes(norm.slice(0, 6)))
        || undefined;
  }

  return (
    <GeoJSON
      key={`choropleth-${colorBy}`}
      data={geojson}
      style={(feature) => {
        const stat = findStat(feature?.properties?.nom ?? '');
        const fillColor = colorBy === 'count'
          ? countToMapColor(stat?.count ?? 0, maxCount)
          : sentimentMapColor(stat?.avg_sentiment ?? null);
        return {
          fillColor,
          fillOpacity: 0.7,
          weight: 2,
          color: '#ffffff',
          opacity: 0.8,
        };
      }}
      onEachFeature={(feature, layer) => {
        const stat = findStat(feature.properties?.nom ?? '');
        const tooltipContent = `
          <div class="font-semibold text-sm">${feature.properties?.nom}</div>
          <div class="text-xs text-gray-500 mt-1">Missatges: <b>${stat?.count ?? 0}</b></div>
          <div class="text-xs text-gray-500">Sent. mitjà: <b>${stat?.avg_sentiment?.toFixed(2) ?? '—'}</b></div>
          ${stat?.top_category ? `<div class="text-xs text-gray-400 mt-1">${stat.top_category}</div>` : ''}
        `;
        layer.bindTooltip(tooltipContent, { sticky: true, className: 'leaflet-custom-tooltip' });
        layer.on('mouseover', function (this: L.Layer) {
          (this as L.Path).setStyle({ fillOpacity: 0.9, weight: 3, color: '#4f46e5' });
        });
        layer.on('mouseout', function (this: L.Layer) {
          (this as L.Path).setStyle({ weight: 2, color: '#ffffff', fillOpacity: 0.7 });
        });
      }}
    />
  );
}

function ClusterLayer({ messages }: { messages: SacMessage[] }) {
  const map = useMap();
  const groupRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    async function init() {
      try {
        await import('leaflet.markercluster');
        await import('leaflet.markercluster/dist/MarkerCluster.css');
        await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
      } catch {
        // CSS import may fail in some setups, that's OK
      }

      if (groupRef.current) {
        map.removeLayer(groupRef.current);
      }

      const group = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
      });

      for (const msg of messages) {
        if (!msg.lat || !msg.lng) continue;
        const marker = L.marker([msg.lat, msg.lng]);
        const popup = `
          <div style="max-width:220px">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px">${msg.barri ?? '—'}</div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:6px">${msg.clas1 ?? '—'}</div>
            <div style="font-size:12px;line-height:1.5;color:#374151">${truncate(msg.message, 120)}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:6px">Sent: ${msg.sentiment ?? '—'}</div>
          </div>
        `;
        marker.bindPopup(popup);
        marker.bindTooltip(`${msg.barri ?? '—'} · ${msg.clas1 ?? '—'}`, { direction: 'top' });
        group.addLayer(marker);
      }

      map.addLayer(group);
      groupRef.current = group;
    }

    init();

    return () => {
      if (groupRef.current) {
        map.removeLayer(groupRef.current);
      }
    };
  }, [map, messages]);

  return null;
}

export default function MapContainerComponent({ mode, geojson, barriStats, messages, colorBy }: Props) {
  return (
    <LeafletMap
      center={[41.543, 2.445]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mode === 'choropleth' ? (
        <ChoroplethLayer geojson={geojson} barriStats={barriStats} colorBy={colorBy} />
      ) : (
        <ClusterLayer messages={messages} />
      )}
    </LeafletMap>
  );
}
