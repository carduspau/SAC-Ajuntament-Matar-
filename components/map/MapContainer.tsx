'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer as LeafletMap, TileLayer, GeoJSON, useMap } from 'react-leaflet';
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
  const barriStatsList = barriStats;

  function normalizeBarri(name: string): string {
    return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function findStat(featureName: string): BarriStat | undefined {
    const norm = normalizeBarri(featureName);
    return barriStatsList.find(b => normalizeBarri(b.barri) === norm)
        || barriStatsList.find(b => normalizeBarri(b.barri).includes(norm.slice(0, 6)))
        || undefined;
  }

  return (
    <GeoJSON
      key={`choropleth-${colorBy}-${barriStats.length}`}
      data={geojson}
      style={(feature) => {
        const stat = findStat(feature?.properties?.nom ?? '');
        const fillColor = colorBy === 'count'
          ? countToMapColor(stat?.count ?? 0, maxCount)
          : sentimentMapColor(stat?.avg_sentiment ?? null);
        return {
          fillColor,
          fillOpacity: stat ? 0.72 : 0.15,
          weight: 1.5,
          color: '#6366f1',
          opacity: 0.6,
        };
      }}
      onEachFeature={(feature, layer) => {
        const stat = findStat(feature.properties?.nom ?? '');
        const name = feature.properties?.nom ?? '';

        // Permanent neighbourhood label
        layer.bindTooltip(name, {
          permanent: true,
          direction: 'center',
          className: 'barri-label',
        });

        layer.on('mouseover', function (this: L.Layer) {
          const tooltipContent = `
            <div style="font-weight:600;font-size:13px;margin-bottom:4px">${name}</div>
            <div style="font-size:11px;color:#6b7280">Missatges: <b>${stat?.count ?? 0}</b></div>
            <div style="font-size:11px;color:#6b7280">Sent. mitj\u00e0: <b>${stat?.avg_sentiment?.toFixed(2) ?? '\u2014'}</b></div>
            ${stat?.top_category ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px">${stat.top_category}</div>` : ''}
          `;
          layer.unbindTooltip();
          layer.bindTooltip(tooltipContent, { sticky: true, className: 'leaflet-custom-tooltip' }).openTooltip();
          (this as L.Path).setStyle({ fillOpacity: 0.9, weight: 2.5, color: '#4f46e5' });
        });
        layer.on('mouseout', function (this: L.Layer) {
          layer.unbindTooltip();
          layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'barri-label' });
          (this as L.Path).setStyle({ weight: 1.5, color: '#6366f1', fillOpacity: stat ? 0.72 : 0.15 });
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
        // CSS import may fail in some setups
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
            <div style="font-weight:600;font-size:13px;margin-bottom:4px">${msg.barri ?? '\u2014'}</div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:6px">${msg.clas1 ?? '\u2014'}</div>
            <div style="font-size:12px;line-height:1.5;color:#374151">${truncate(msg.message, 120)}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:6px">Sent: ${msg.sentiment ?? '\u2014'}</div>
          </div>
        `;
        marker.bindPopup(popup);
        marker.bindTooltip(`${msg.barri ?? '\u2014'} \u00b7 ${msg.clas1 ?? '\u2014'}`, { direction: 'top' });
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
      center={[41.543, 2.447]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      {/* Esri Light Gray Base */}
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
        url="https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />
      {/* Esri Light Gray Reference (labels) */}
      <TileLayer
        url="https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />
      {mode === 'choropleth' ? (
        <ChoroplethLayer geojson={geojson} barriStats={barriStats} colorBy={colorBy} />
      ) : (
        <ClusterLayer messages={messages} />
      )}
    </LeafletMap>
  );
}
