'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { MapContainer as LeafletMap, TileLayer, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection } from 'geojson';
import type { BarriStat, SacMessage } from '@/types';
import { parseSentiment, sentimentColor, sentimentLabel } from '@/lib/sentiment';
import { truncate, formatDate } from '@/lib/utils';

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

// ─── Colour helpers (matching SAC-Demo blue scale) ───────────────────────────

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

/** Blue-scale fill for count choropleth: low=[219,234,254] → high=[37,99,235] */
function countFillRgb(count: number, maxCount: number): [number, number, number] {
  if (maxCount === 0) return [219, 234, 254];
  const t = Math.min(count / maxCount, 1);
  return [
    lerp(219, 37, t),
    lerp(234, 99, t),
    lerp(254, 235, t),
  ];
}

/** Sentiment fill: red→amber→indigo→emerald */
function sentimentFillRgb(score: number | null): [number, number, number] {
  if (score === null) return [191, 219, 254];
  if (score < 3)  return [239, 68,  68 ];  // red
  if (score < 5)  return [245, 158, 11 ];  // amber
  if (score < 7)  return [99,  102, 241];  // indigo
  return              [16,  185, 129];  // emerald
}

function rgbStr([r, g, b]: [number, number, number], alpha = 1) {
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Blend rgb toward hover blue [29,78,216] at 35% */
function hoverFillRgb(fill: [number, number, number]): [number, number, number] {
  const hover: [number, number, number] = [29, 78, 216];
  return [
    lerp(fill[0], hover[0], 0.35),
    lerp(fill[1], hover[1], 0.35),
    lerp(fill[2], hover[2], 0.35),
  ];
}

// ─── Normalise barri name for fuzzy matching ──────────────────────────────────

function normalizeBarri(name: string): string {
  return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ─── Choropleth layer ─────────────────────────────────────────────────────────

function ChoroplethLayer({ geojson, barriStats, colorBy }: Omit<Props, 'mode' | 'messages'>) {
  const map = useMap();
  const popupRef = useRef<L.Popup | null>(null);

  const maxCount = Math.max(...barriStats.map(b => b.count), 1);

  function findStat(featureName: string): BarriStat | undefined {
    const norm = normalizeBarri(featureName);
    return (
      barriStats.find(b => normalizeBarri(b.barri) === norm) ||
      barriStats.find(b => normalizeBarri(b.barri).includes(norm.slice(0, 6))) ||
      undefined
    );
  }

  function getFill(featureName: string): [number, number, number] {
    const stat = findStat(featureName);
    if (colorBy === 'count') {
      return countFillRgb(stat?.count ?? 0, maxCount);
    }
    return sentimentFillRgb(stat?.avg_sentiment ?? null);
  }

  function getLayerStyle(feature: any): L.PathOptions {
    const name = feature?.properties?.name ?? feature?.properties?.nom ?? '';
    const stat = findStat(name);
    const fill = getFill(name);
    return {
      fillColor: rgbStr(fill, stat ? 0.42 + (Math.min((stat.count / maxCount), 1)) * 0.28 : 0.18),
      fillOpacity: 1,
      weight: stat ? 1.7 : 1.45,
      color: 'rgba(59,130,246,0.86)',
      opacity: 1,
    };
  }

  function showAreaPopup(feature: any, latlng: L.LatLng) {
    const name = feature?.properties?.name ?? feature?.properties?.nom ?? '';
    const stat = findStat(name);
    const sentScore = stat?.avg_sentiment ?? null;
    const sentCol = sentimentColor(sentScore);
    const sentLbl = sentimentLabel(sentScore);

    const html = `
      <div style="font-family:inherit;min-width:13rem;padding:.1rem">
        <div style="font-weight:700;font-size:.875rem;color:#0f172a;margin-bottom:.5rem">${name}</div>
        <div style="display:flex;justify-content:space-between;font-size:.75rem;color:#475569;margin-bottom:.25rem">
          <span>Missatges</span>
          <span style="font-weight:600;color:#0f172a">${stat?.count ?? 0}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.75rem;color:#475569;margin-bottom:.25rem">
          <span>Sentiment mitjà</span>
          <span style="font-weight:600;color:${sentCol}">${sentScore !== null ? sentScore.toFixed(2) : '—'}</span>
        </div>
        ${stat?.top_category ? `
        <div style="margin-top:.4rem;padding-top:.4rem;border-top:1px solid #f1f5f9">
          <span style="font-size:.7rem;color:#94a3b8">${stat.top_category}</span>
        </div>` : ''}
        <div style="margin-top:.4rem;padding:.2rem .5rem;border-radius:.375rem;background:${sentCol}18;display:inline-block">
          <span style="font-size:.7rem;font-weight:600;color:${sentCol}">${sentLbl}</span>
        </div>
      </div>
    `;

    if (!popupRef.current) {
      popupRef.current = L.popup({
        closeButton: false,
        className: 'hs-area-popup',
        offset: [0, -4],
        autoPan: false,
      });
    }
    popupRef.current.setLatLng(latlng).setContent(html).openOn(map);
  }

  function hideAreaPopup() {
    if (popupRef.current) {
      map.closePopup(popupRef.current);
    }
  }

  return (
    <GeoJSON
      key={`choropleth-${colorBy}-${barriStats.length}`}
      data={geojson}
      style={(feature) => getLayerStyle(feature)}
      onEachFeature={(feature, layer) => {
        const name = feature.properties?.name ?? feature.properties?.nom ?? '';

        // Permanent pill label
        layer.bindTooltip(name, {
          permanent: true,
          direction: 'center',
          className: 'hs-neighborhood-label',
        });

        layer.on('mouseover', function () {
          const fill = getFill(name);
          const hf = hoverFillRgb(fill);
          const stat = findStat(name);
          ;(layer as L.Path).setStyle({
            fillColor: rgbStr(hf, 0.66),
            fillOpacity: 1,
            color: '#1d4ed8',
            weight: 2.1,
          });
        });

        layer.on('mousemove', function (e: L.LeafletMouseEvent) {
          showAreaPopup(feature, e.latlng);
        });

        layer.on('mouseout', function () {
          ;(layer as L.Path).setStyle(getLayerStyle(feature));
          hideAreaPopup();
        });
      }}
    />
  );
}

// ─── Point / cluster layer ────────────────────────────────────────────────────

/** Cluster radius in pixels, matching SAC-Demo algorithm */
function getClusterRadiusPx(zoom: number): number {
  if (zoom >= 16.7) return 0;
  return Math.max(14, Math.round(64 - ((Math.max(11, Math.min(16.7, zoom)) - 11) / 5.7) * 50));
}

/** Marker size for a cluster count, log-scaled 24–50 px */
function clusterSizePx(count: number): number {
  if (count === 1) return 12;
  return Math.min(50, Math.round(24 + Math.log(count) * 6));
}

interface ClusterPoint {
  lat: number;
  lng: number;
  msgs: SacMessage[];
}

/** Group messages into proximity clusters for the given zoom level */
function buildClusters(messages: SacMessage[], map: L.Map): ClusterPoint[] {
  const zoom = map.getZoom();
  const radiusPx = getClusterRadiusPx(zoom);

  // Convert pixel radius to degrees (approximate)
  const centerLat = map.getCenter().lat;
  const metersPerPx = (40075016.686 * Math.abs(Math.cos((centerLat * Math.PI) / 180))) / (256 * Math.pow(2, zoom));
  const radiusMeters = radiusPx * metersPerPx;
  const radiusDeg = radiusMeters / 111320; // ~meters per degree lat

  const assigned = new Set<number>();
  const clusters: ClusterPoint[] = [];

  for (let i = 0; i < messages.length; i++) {
    if (assigned.has(i)) continue;
    const msg = messages[i];
    if (!msg.lat || !msg.lng) continue;

    const clusterMsgs: SacMessage[] = [msg];
    assigned.add(i);

    if (radiusPx > 0) {
      for (let j = i + 1; j < messages.length; j++) {
        if (assigned.has(j)) continue;
        const m2 = messages[j];
        if (!m2.lat || !m2.lng) continue;
        const dlat = m2.lat - msg.lat;
        const dlng = m2.lng - msg.lng;
        const dist = Math.sqrt(dlat * dlat + dlng * dlng);
        if (dist < radiusDeg) {
          clusterMsgs.push(m2);
          assigned.add(j);
        }
      }
    }

    // Centroid
    const lat = clusterMsgs.reduce((s, m) => s + (m.lat ?? 0), 0) / clusterMsgs.length;
    const lng = clusterMsgs.reduce((s, m) => s + (m.lng ?? 0), 0) / clusterMsgs.length;
    clusters.push({ lat, lng, msgs: clusterMsgs });
  }

  return clusters;
}

function makeIncidentIcon(count: number): L.DivIcon {
  const isSingle = count === 1;
  const cls = isSingle
    ? 'hs-users-incident-marker hs-users-incident-marker-single'
    : 'hs-users-incident-marker';
  const size = clusterSizePx(count);
  const label = isSingle ? '' : String(count);

  return L.divIcon({
    className: '',
    html: `<span class="${cls}" style="width:${size}px;height:${size}px">${label}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makePointPopupHtml(msgs: SacMessage[]): string {
  if (msgs.length === 1) {
    const msg = msgs[0];
    const score = parseSentiment(msg.sentiment ?? null);
    const col = sentimentColor(score);
    const lbl = sentimentLabel(score);
    return `
      <div style="font-family:inherit;max-width:14rem;padding:.1rem">
        <div style="font-size:.75rem;line-height:1.5;color:#374151;margin-bottom:.5rem">
          ${truncate(msg.message, 120)}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.7rem;color:#6b7280;margin-bottom:.2rem">
          <span>Data</span><span>${formatDate(msg.data_inici ?? null, 'dd/MM/yy HH:mm')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.7rem;color:#6b7280;margin-bottom:.2rem">
          <span>Sentiment</span>
          <span style="font-weight:600;color:${col}">${score !== null ? score.toFixed(1) : '—'} · ${lbl}</span>
        </div>
        ${msg.clas1 ? `
        <div style="display:flex;justify-content:space-between;font-size:.7rem;color:#6b7280;margin-bottom:.2rem">
          <span>Tipus</span><span style="font-weight:500">${msg.clas1}</span>
        </div>` : ''}
        ${msg.barri ? `
        <div style="margin-top:.4rem;padding:.2rem .5rem;border-radius:.375rem;background:#f1f5f9;font-size:.68rem;color:#475569">
          ${msg.barri}
        </div>` : ''}
      </div>
    `;
  }
  // Cluster summary
  const total = msgs.length;
  const scores = msgs.map(m => parseSentiment(m.sentiment ?? null)).filter(s => s !== null) as number[];
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const col = sentimentColor(avg);
  return `
    <div style="font-family:inherit;min-width:10rem;padding:.1rem">
      <div style="font-weight:700;font-size:.875rem;color:#0f172a;margin-bottom:.4rem">${total} missatges</div>
      <div style="display:flex;justify-content:space-between;font-size:.75rem;color:#6b7280">
        <span>Sent. mitjà</span>
        <span style="font-weight:600;color:${col}">${avg !== null ? avg.toFixed(2) : '—'}</span>
      </div>
      <div style="margin-top:.5rem;font-size:.7rem;color:#94a3b8">Fes clic per apropar</div>
    </div>
  `;
}

function PointLayer({ messages }: { messages: SacMessage[] }) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);
  const renderScheduled = useRef(false);

  const renderClusters = useCallback(() => {
    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const clusters = buildClusters(messages, map);

    for (const cluster of clusters) {
      const { lat, lng, msgs } = cluster;
      const icon = makeIncidentIcon(msgs.length);
      const marker = L.marker([lat, lng], { icon });

      const popupHtml = makePointPopupHtml(msgs);
      marker.bindPopup(popupHtml, {
        closeButton: false,
        className: 'hs-point-popup',
        offset: [0, -clusterSizePx(msgs.length) / 2],
      });

      if (msgs.length > 1) {
        // Click cluster → zoom in
        marker.on('click', () => {
          const lats = msgs.map(m => m.lat ?? lat);
          const lngs = msgs.map(m => m.lng ?? lng);
          const bounds = L.latLngBounds(
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          );
          map.fitBounds(bounds.pad(0.5), { maxZoom: 16 });
        });
        marker.on('mouseover', () => marker.openPopup());
        marker.on('mouseout', () => marker.closePopup());
      } else {
        // Single marker: click to open popup
        marker.on('mouseover', () => marker.openPopup());
      }

      marker.addTo(map);
      markersRef.current.push(marker);
    }
  }, [map, messages]);

  // Re-render clusters on zoom/move end
  useMapEvents({
    zoomend: () => {
      if (!renderScheduled.current) {
        renderScheduled.current = true;
        requestAnimationFrame(() => {
          renderScheduled.current = false;
          renderClusters();
        });
      }
    },
    moveend: () => {
      if (!renderScheduled.current) {
        renderScheduled.current = true;
        requestAnimationFrame(() => {
          renderScheduled.current = false;
          renderClusters();
        });
      }
    },
  });

  useEffect(() => {
    renderClusters();
    return () => {
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
    };
  }, [renderClusters]);

  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

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
        <PointLayer messages={messages} />
      )}
    </LeafletMap>
  );
}
