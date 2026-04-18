'use client';

import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  MissatgesCard, SentimentCard, AlertesCard, CategoriesCard,
} from '@/components/inici/SummaryCards';
import { AlertsPanel } from '@/components/inici/AlertsPanel';
import { QuickNav } from '@/components/inici/QuickNav';
import { CategoriesChart } from '@/components/inici/CategoriesChart';
import { CanalChart } from '@/components/inici/CanalChart';
import { CriticalAlertsSection } from '@/components/inici/CriticalAlertsSection';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChartWrapper } from '@/components/ui/ChartWrapper';
import { useStats } from '@/hooks/useStats';
import { useTimeline } from '@/hooks/useTimeline';
import { useEnrichedStats } from '@/hooks/useEnrichedStats';
import { useDateRange } from '@/context/DateRangeContext';
import { intentMeta, languageMeta } from '@/lib/intentColors';
import { cn } from '@/lib/utils';

const INTENT_ORDER = ['queixa', 'incidència', 'consulta', 'sol·licitud', 'suggeriment', 'agraïment'];

export default function InicioPage() {
  const { data: stats, loading: statsLoading } = useStats();
  const { data: timeline, loading: timelineLoading } = useTimeline();
  const { data: enriched, loading: enrichedLoading } = useEnrichedStats();
  const { granularity, from, to } = useDateRange();

  const topLoading = statsLoading || timelineLoading;

  // Intent pie data
  const intentPie = INTENT_ORDER
    .map(k => ({ name: intentMeta(k).label, value: enriched?.by_intent.find(i => i.key === k)?.count ?? 0, hex: intentMeta(k).hex }))
    .filter(d => d.value > 0);

  // Language data
  const langData = enriched?.by_language ?? [];

  return (
    <div className="space-y-6">
      {/* 4 Rich Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        <MissatgesCard stats={stats} timeline={timeline} loading={topLoading} granularity={granularity} from={from} to={to} />
        <SentimentCard stats={stats} timeline={timeline} loading={topLoading} granularity={granularity} />
        <AlertesCard stats={stats} loading={statsLoading} />
        <CategoriesCard stats={stats} loading={statsLoading} />
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader><CardTitle>Evolució temporal</CardTitle></CardHeader>
        <TimelineChart data={timeline} loading={timelineLoading} granularity={granularity} height={300} showSentiment title="evolucio-temporal" />
      </Card>

      {/* Categories + Canal charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoriesChart data={stats?.by_clas1 ?? []} loading={statsLoading} />
        <CanalChart data={stats?.by_canal ?? []} loading={statsLoading} />
      </div>

      {/* Full-width Critical Alerts Section */}
      <CriticalAlertsSection stats={stats} loading={statsLoading} />

      {/* ── Intencions & Seguiment ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Intencions i experiència ciutadana</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Intent donut */}
          <Card>
            <CardHeader><CardTitle>Distribució per intenció</CardTitle></CardHeader>
            {enrichedLoading ? <Skeleton className="h-52 w-full" /> : (
              <ChartWrapper
                title="distribucio-intencio"
                csvData={intentPie.map(d => ({ Intencio: d.name, Missatges: d.value }))}
              >
                <div className="flex items-center gap-2">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie data={intentPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                        {intentPie.map((d, i) => <Cell key={i} fill={d.hex} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, _: unknown, props: { payload?: { name?: string } }) => [
                          v.toLocaleString('ca-ES'), props.payload?.name ?? 'Missatges'
                        ]}
                        contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {intentPie.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.hex }} />
                        <span className="text-muted-foreground-1 flex-1 truncate">{d.name}</span>
                        <span className="font-medium text-foreground">{d.value.toLocaleString('ca-ES')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartWrapper>
            )}
          </Card>

          {/* Language distribution */}
          <Card>
            <CardHeader><CardTitle>Distribució per idioma</CardTitle></CardHeader>
            {enrichedLoading ? <Skeleton className="h-52 w-full" /> : (
              <div className="flex flex-col gap-4 pt-1">
                {langData.map(l => {
                  const m = languageMeta(l.key);
                  return (
                    <div key={l.key}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className={cn('font-semibold px-2 py-0.5 rounded-full', m.bg, m.text)}>{m.label}</span>
                        <span className="text-muted-foreground-2">{l.count.toLocaleString('ca-ES')} ({l.pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2.5 bg-muted-hover rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${l.pct}%`, backgroundColor: m.hex }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Followup KPI */}
          <Card>
            <CardHeader><CardTitle>Seguiment pendent</CardTitle></CardHeader>
            {enrichedLoading ? <Skeleton className="h-52 w-full" /> : (
              <div className="flex flex-col items-center justify-center gap-4 py-4">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="12"
                      strokeDasharray={`${2 * Math.PI * 40 * (enriched?.followup_pct ?? 0) / 100} ${2 * Math.PI * 40}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-red-600">{(enriched?.followup_pct ?? 0).toFixed(0)}%</span>
                    <span className="text-[10px] text-muted-foreground-2">del total</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-foreground">{enriched?.followup_count.toLocaleString('ca-ES') ?? '—'}</p>
                  <p className="text-sm text-muted-foreground-2">missatges requereixen seguiment</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Heatmap full width */}
      <Card>
        <CardHeader><CardTitle>Mapa de calor: dia × hora</CardTitle></CardHeader>
        <HeatmapChart data={stats?.heatmap ?? []} loading={statsLoading} title="mapa-de-calor" />
      </Card>

      {/* Alerts + Quick Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1"><AlertsPanel /></div>
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-muted-foreground-1 mb-3">Accés ràpid</h2>
          <QuickNav />
        </div>
      </div>
    </div>
  );
}
