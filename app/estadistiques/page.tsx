'use client';

import React, { useState, useEffect } from 'react';
import { FilterPanel } from '@/components/estadistiques/FilterPanel';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { SentimentHistogram } from '@/components/charts/SentimentHistogram';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { ChannelPieChart } from '@/components/charts/ChannelPieChart';
import { NeighborhoodBarChart } from '@/components/charts/NeighborhoodBarChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { useDateRange } from '@/context/DateRangeContext';
import { buildQueryString } from '@/lib/utils';
import type { StatsResponse, TimelineBucket, TimelineGranularity } from '@/types';

interface LocalFilters {
  barri?: string;
  canal?: string;
  clas1?: string;
  sentimentMin?: number;
  sentimentMax?: number;
}

export default function EstadistiquesPage() {
  const { from, to, granularity } = useDateRange();
  const [filters, setFilters] = useState<LocalFilters>({});
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const base = { from: from.toISOString(), to: to.toISOString(), ...filters };
    Promise.all([
      fetch(`/api/messages/stats?${buildQueryString(base)}`).then(r => r.json()),
      fetch(`/api/messages/timeline?${buildQueryString({ ...base, granularity })}`).then(r => r.json()),
    ]).then(([s, t]) => {
      setStats(s);
      setTimeline(Array.isArray(t) ? t : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [from, to, granularity, JSON.stringify(filters)]);

  function setFilter<K extends keyof LocalFilters>(key: K, value: LocalFilters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function resetFilters() { setFilters({}); }

  const colorBy = filters.sentimentMin !== undefined || filters.sentimentMax !== undefined ? 'sentiment' : 'count';

  return (
    <div className="space-y-6">
      <FilterPanel filters={filters} onFilterChange={setFilter} onReset={resetFilters} />

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Evolució temporal</CardTitle>
        </CardHeader>
        <TimelineChart data={timeline} loading={loading} granularity={granularity} height={260} />
      </Card>

      {/* Row 1: Sentiment + Channel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribució de sentiment</CardTitle>
          </CardHeader>
          <SentimentHistogram data={stats?.sentiment_distribution ?? []} loading={loading} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Missatges per canal</CardTitle>
          </CardHeader>
          <ChannelPieChart data={stats?.by_canal ?? []} loading={loading} />
        </Card>
      </div>

      {/* Row 2: Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Missatges per categoria</CardTitle>
        </CardHeader>
        <CategoryBarChart data={stats?.by_clas1 ?? []} loading={loading} height={320} />
      </Card>

      {/* Row 3: Barris */}
      <Card>
        <CardHeader>
          <CardTitle>Missatges per barri</CardTitle>
        </CardHeader>
        <NeighborhoodBarChart data={stats?.by_barri ?? []} loading={loading} colorBy={colorBy} />
      </Card>

      {/* Row 4: Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de calor: dia × hora</CardTitle>
        </CardHeader>
        <HeatmapChart data={stats?.heatmap ?? []} loading={loading} />
      </Card>

      {/* Summary table */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Resum per barri</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Barri</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Missatges</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Sent. mitjà</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Top categoria</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_barri.map((b, i) => (
                  <tr key={b.barri} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                    <td className="py-2 px-3 font-medium text-gray-900">{b.barri}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{b.count.toLocaleString('ca-ES')}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{b.avg_sentiment?.toFixed(2) ?? '—'}</td>
                    <td className="py-2 px-3 text-gray-500 truncate max-w-[200px]">{b.top_category ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
