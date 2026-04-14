'use client';

import React from 'react';
import {
  MessageSquare, TrendingUp, AlertTriangle, Tag,
  Radio, MapPin, AlertOctagon, Layers,
} from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total missatges"
          value={stats ? stats.total.toLocaleString('ca-ES') : '—'}
          icon={<MessageSquare className="w-4 h-4" />}
          loading={statsLoading}
        />
        <KpiCard
          label="Sentiment mitjà"
          value={avgSent !== null && avgSent !== undefined ? avgSent.toFixed(2) : '—'}
          sub="Escala de 0 a 10"
          icon={<TrendingUp className="w-4 h-4" />}
          variant={avgSent !== null && avgSent !== undefined && avgSent < 4 ? 'warning' : 'default'}
          loading={statsLoading}
        />
        <KpiCard
          label="Alertes crítiques"
          value={stats ? stats.critical_count.toLocaleString('ca-ES') : '—'}
          sub="Sentiment < 3"
          icon={<AlertTriangle className="w-4 h-4" />}
          variant={stats && stats.critical_count > 0 ? 'danger' : 'success'}
          loading={statsLoading}
        />
        <KpiCard
          label="Categoria principal"
          value={stats?.by_clas1[0]?.category ?? '—'}
          sub={stats?.by_clas1[0] ? `${stats.by_clas1[0].count} missatges` : undefined}
          icon={<Tag className="w-4 h-4" />}
          loading={statsLoading}
        />
      </div>

      {/* Secondary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Canal principal"
          value={stats?.by_canal[0]?.canal ?? '—'}
          sub={stats?.by_canal[0] ? `${stats.by_canal[0].count} missatges` : undefined}
          icon={<Radio className="w-4 h-4" />}
          loading={statsLoading}
        />
        <KpiCard
          label="Barris actius"
          value={stats ? stats.by_barri.length.toLocaleString('ca-ES') : '—'}
          sub="Barris amb activitat"
          icon={<MapPin className="w-4 h-4" />}
          loading={statsLoading}
        />
        <KpiCard
          label="% Missatges crítics"
          value={criticalPct !== null ? `${criticalPct}%` : '—'}
          sub="Del total del període"
          icon={<AlertOctagon className="w-4 h-4" />}
          variant={criticalPct !== null && parseFloat(criticalPct) > 10 ? 'danger' : 'default'}
          loading={statsLoading}
        />
        <KpiCard
          label="Categories actives"
          value={stats ? stats.by_clas1.length.toLocaleString('ca-ES') : '—'}
          sub="Categories distintes"
          icon={<Layers className="w-4 h-4" />}
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

          {/* Top barris summary */}
          {stats && stats.by_barri.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top barris</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {stats.by_barri.slice(0, 5).map((b, i) => (
                  <div key={b.barri} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground-2 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground-1">{b.barri}</span>
                        <span className="text-sm font-semibold text-foreground">{b.count}</span>
                      </div>
                      <div className="h-1.5 bg-muted-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
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
