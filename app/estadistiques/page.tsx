'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FilterPanel, EMPTY_FILTERS } from '@/components/estadistiques/FilterPanel';
import type { StatsFilters } from '@/components/estadistiques/FilterPanel';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { SentimentHistogram } from '@/components/charts/SentimentHistogram';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { ChannelPieChart } from '@/components/charts/ChannelPieChart';
import { NeighborhoodBarChart } from '@/components/charts/NeighborhoodBarChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { useDateRange } from '@/context/DateRangeContext';
import { supabase } from '@/lib/supabase';
import { computeStats, computeTimeline } from '@/lib/aggregations';
import { parseSentiment } from '@/lib/sentiment';
import type { StatsResponse, TimelineBucket } from '@/types';

function sentimentMatches(score: number, category: string): boolean {
  if (category === 'positiu') return score >= 6;
  if (category === 'neutre') return score >= 3.5 && score < 6;
  if (category === 'negatiu') return score < 3.5;
  return false;
}

export default function EstadistiquesPage() {
  const { from, to, granularity } = useDateRange();
  const [filters, setFilters] = useState<StatsFilters>(EMPTY_FILTERS);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('sac_messages')
        .select('id,sentiment,barri,canal,clas1,data_inici')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString());

      if (filters.barris.length > 0) q = q.in('barri', filters.barris);
      if (filters.canals.length > 0) q = q.in('canal', filters.canals);
      if (filters.clas1s.length > 0) q = q.in('clas1', filters.clas1s);

      const { data: rows } = await q;
      const allRows = rows ?? [];

      // Client-side sentiment category filter
      let filtered =
        filters.sentiments.length > 0
          ? allRows.filter(r => {
              const s = parseSentiment(r.sentiment);
              if (s === null) return false;
              return filters.sentiments.some(cat => sentimentMatches(s, cat));
            })
          : allRows;

      // Critical alerts filter
      if (filters.onlyAlerts) {
        filtered = filtered.filter(r => {
          const s = parseSentiment(r.sentiment);
          return s !== null && s < 3.5;
        });
      }

      setStats(computeStats(filtered));
      setTimeline(computeTimeline(filtered, granularity));
    } catch (e) {
      console.error('Estadistiques fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [from.toISOString(), to.toISOString(), granularity, JSON.stringify(filters)]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const colorBy = filters.sentiments.length > 0 ? 'sentiment' : 'count';

  return (
    <div className="space-y-6">
      <FilterPanel filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY_FILTERS)} />

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
            <table className="min-w-full divide-y divide-line-2 text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground-2 uppercase">Barri</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground-2 uppercase">Missatges</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground-2 uppercase">Sent. mitjà</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground-2 uppercase">Top categoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-2">
                {stats.by_barri.map((b) => (
                  <tr key={b.barri} className="hover:bg-muted-hover transition-colors">
                    <td className="py-2 px-3 font-medium text-foreground">{b.barri}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground-1">{b.count.toLocaleString('ca-ES')}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground-1">{b.avg_sentiment?.toFixed(2) ?? '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground truncate max-w-[200px]">{b.top_category ?? '—'}</td>
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
