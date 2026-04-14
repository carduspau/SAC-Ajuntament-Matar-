'use client';

import React from 'react';
import { KpiCard } from '@/components/inici/KpiCard';
import { AlertsPanel } from '@/components/inici/AlertsPanel';
import { QuickNav } from '@/components/inici/QuickNav';
import { CategoriesChart } from '@/components/inici/CategoriesChart';
import { CanalChart } from '@/components/inici/CanalChart';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { useStats } from '@/hooks/useStats';
import { useTimeline } from '@/hooks/useTimeline';
import { useDateRange } from '@/context/DateRangeContext';

export default function InicioPage() {
  const { data: stats, loading: statsLoading } = useStats();
  const { data: timeline, loading: timelineLoading } = useTimeline();
  const { granularity } = useDateRange();

  const avgSent = stats?.avg_sentiment;
  const criticalPct = stats
    ? ((stats.critical_count / Math.max(stats.total, 1)) * 100).toFixed(1)
    : null;

  // Sparkline data derived from timeline
  const sparklineCount    = timeline.map(d => d.count);
  const sparklineSentiment = timeline
    .filter(d => d.avg_sentiment !== null)
    .map(d => d.avg_sentiment!);

  return (
    <div className="space-y-6">
      {/* Primary KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total missatges"
          value={stats ? stats.total.toLocaleString('ca-ES') : '—'}
          sub="Període seleccionat"
          sparkline={sparklineCount}
          loading={statsLoading}
        />
        <KpiCard
          label="Sentiment mitjà"
          value={avgSent !== null && avgSent !== undefined ? avgSent.toFixed(2) : '—'}
          sub="Escala de 0 a 10"
          sparkline={sparklineSentiment}
          variant={avgSent !== null && avgSent !== undefined && avgSent < 4 ? 'warning' : 'default'}
          loading={statsLoading}
        />
        <KpiCard
          label="Alertes crítiques"
          value={stats ? stats.critical_count.toLocaleString('ca-ES') : '—'}
          sub="Sentiment < 3.5"
          variant={stats && stats.critical_count > 0 ? 'danger' : 'success'}
          invertTrend
          loading={statsLoading}
        />
        <KpiCard
          label="Categoria principal"
          value={stats?.by_clas1[0]?.category ?? '—'}
          sub={stats?.by_clas1[0] ? `${stats.by_clas1[0].count.toLocaleString('ca-ES')} missatges` : undefined}
          loading={statsLoading}
        />
      </div>

      {/* Secondary KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Canal principal"
          value={stats?.by_canal[0]?.canal ?? '—'}
          sub={stats?.by_canal[0] ? `${stats.by_canal[0].count.toLocaleString('ca-ES')} missatges` : undefined}
          loading={statsLoading}
        />
        <KpiCard
          label="Barris actius"
          value={stats ? stats.by_barri.length.toLocaleString('ca-ES') : '—'}
          sub="Barris amb activitat"
          loading={statsLoading}
        />
        <KpiCard
          label="% Missatges crítics"
          value={criticalPct !== null ? `${criticalPct}%` : '—'}
          sub="Del total del període"
          variant={criticalPct !== null && parseFloat(criticalPct) > 10 ? 'danger' : 'default'}
          loading={statsLoading}
        />
        <KpiCard
          label="Categories actives"
          value={stats ? stats.by_clas1.length.toLocaleString('ca-ES') : '—'}
          sub="Categories distintes"
          loading={statsLoading}
        />
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolució temporal</CardTitle>
        </CardHeader>
        <TimelineChart
          data={timeline}
          loading={timelineLoading}
          granularity={granularity}
          height={300}
          showSentiment
        />
      </Card>

      {/* Categories + Canal charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoriesChart data={stats?.by_clas1 ?? []} loading={statsLoading} />
        <CanalChart data={stats?.by_canal ?? []} loading={statsLoading} />
      </div>

      {/* Alerts + Quick Nav + Top barris */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AlertsPanel />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground-1 mb-3">Accés ràpid</h2>
            <QuickNav />
          </div>

          {/* Top barris */}
          {stats && stats.by_barri.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top barris</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                {stats.by_barri.slice(0, 5).map((b, i) => (
                  <div key={b.barri} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground-2 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-foreground truncate">{b.barri}</span>
                        <span className="text-sm font-semibold text-foreground ml-2 shrink-0">
                          {b.count.toLocaleString('ca-ES')}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(b.count / stats.by_barri[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
