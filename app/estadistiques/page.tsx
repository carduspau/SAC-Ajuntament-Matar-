'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { FilterPanel, EMPTY_FILTERS } from '@/components/estadistiques/FilterPanel';
import type { StatsFilters } from '@/components/estadistiques/FilterPanel';
import { ChartWrapper } from '@/components/ui/ChartWrapper';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { SentimentHistogram } from '@/components/charts/SentimentHistogram';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { ChannelPieChart } from '@/components/charts/ChannelPieChart';
import { NeighborhoodBarChart } from '@/components/charts/NeighborhoodBarChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDateRange } from '@/context/DateRangeContext';
import { useEnrichedStats } from '@/hooks/useEnrichedStats';
import { supabase } from '@/lib/supabase';
import { computeStats, computeTimeline } from '@/lib/aggregations';
import { parseSentiment } from '@/lib/sentiment';
import { INTENT_META, ACTION_META, EXPERIENCE_META, LANGUAGE_META, intentMeta, actionMeta, experienceMeta, languageMeta, deptMeta } from '@/lib/intentColors';
import { cn } from '@/lib/utils';
import type { StatsResponse, TimelineBucket } from '@/types';

const INTENT_ORDER    = ['queixa', 'incidència', 'consulta', 'sol·licitud', 'suggeriment', 'agraïment'];
const ACTION_ORDER    = ['desplaçament_físic', 'reparar', 'investigar', 'derivar', 'informar', 'cap'];
const EXP_ORDER      = ['primera_interacció', 'reincident_satisfet', 'reincident_frustrat'];

function sentimentMatches(score: number, category: string): boolean {
  if (category === 'positiu') return score >= 6;
  if (category === 'neutre') return score >= 3.5 && score < 6;
  if (category === 'negatiu') return score < 3.5;
  return false;
}

function EstadistiquesPageInner() {
  const { from, to, granularity } = useDateRange();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<StatsFilters>(EMPTY_FILTERS);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: enriched, loading: enrichedLoading } = useEnrichedStats();

  // Pre-populate barri filter from URL param ?barri=...
  useEffect(() => {
    const barriParam = searchParams.get('barri');
    if (barriParam) {
      setFilters(prev => ({ ...prev, barris: [barriParam] }));
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('sac_messages')
        .select('id,sentiment,barri,canal,clas1,data_inici,intent,department,action_required,language,citizen_experience_signal,followup_needed')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString());

      if (filters.barris.length > 0)       q = q.in('barri', filters.barris);
      if (filters.canals.length > 0)       q = q.in('canal', filters.canals);
      if (filters.clas1s.length > 0)       q = q.in('clas1', filters.clas1s);
      if (filters.intents.length > 0)      q = q.in('intent', filters.intents);
      if (filters.departments.length > 0)  q = q.in('department', filters.departments);
      if (filters.actions.length > 0)      q = q.in('action_required', filters.actions);
      if (filters.languages.length > 0)    q = q.in('language', filters.languages);
      if (filters.experiences.length > 0)  q = q.in('citizen_experience_signal', filters.experiences);
      if (filters.followupOnly)             q = q.eq('followup_needed', true);

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
        <TimelineChart data={timeline} loading={loading} granularity={granularity} height={260} title="evolucio-temporal" />
      </Card>

      {/* Row 1: Sentiment + Channel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribució de sentiment</CardTitle>
          </CardHeader>
          <SentimentHistogram data={stats?.sentiment_distribution ?? []} loading={loading} title="distribucio-sentiment" />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Missatges per canal</CardTitle>
          </CardHeader>
          <ChannelPieChart data={stats?.by_canal ?? []} loading={loading} title="missatges-canal" />
        </Card>
      </div>

      {/* Row 2: Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Missatges per categoria</CardTitle>
        </CardHeader>
        <CategoryBarChart data={stats?.by_clas1 ?? []} loading={loading} height={320} title="missatges-categoria" />
      </Card>

      {/* Row 3: Barris */}
      <Card>
        <CardHeader>
          <CardTitle>Missatges per barri</CardTitle>
        </CardHeader>
        <NeighborhoodBarChart data={stats?.by_barri ?? []} loading={loading} colorBy={colorBy} title="missatges-barri" />
      </Card>

      {/* Row 4: Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de calor: dia × hora</CardTitle>
        </CardHeader>
        <HeatmapChart data={stats?.heatmap ?? []} loading={loading} title="mapa-de-calor" />
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

      {/* ── Classificació i gestió ── */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Classificació i gestió</h2>
          <span className="text-xs text-muted-foreground-2 bg-muted-hover px-2 py-0.5 rounded-full">intent · departament · acció · experiència · idioma · seguiment</span>
        </div>

        {/* Row 1: Intent donut + Action donut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Intent donut */}
          <Card>
            <CardHeader><CardTitle>Distribució per intenció</CardTitle></CardHeader>
            {enrichedLoading ? <Skeleton className="h-52 w-full" /> : (() => {
              const intentPie = INTENT_ORDER
                .map(k => ({ name: intentMeta(k).label, value: enriched?.by_intent.find(i => i.key === k)?.count ?? 0, hex: intentMeta(k).hex }))
                .filter(d => d.value > 0);
              const total = intentPie.reduce((s, x) => s + x.value, 0);
              return (
                <ChartWrapper
                  title="distribucio-intencio"
                  csvData={intentPie.map(d => ({ Intencio: d.name, Missatges: d.value, 'Percentatge (%)': total > 0 ? (d.value / total * 100).toFixed(1) : '0' }))}
                >
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={intentPie} cx="50%" cy="50%" innerRadius={48} outerRadius={78} dataKey="value" paddingAngle={2}>
                          {intentPie.map((d, i) => <Cell key={i} fill={d.hex} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [v.toLocaleString('ca-ES'), 'Missatges']}
                          contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {intentPie.map(d => {
                        const pct = total > 0 ? (d.value / total * 100).toFixed(0) : '0';
                        return (
                          <div key={d.name} className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.hex }} />
                            <span className="text-muted-foreground-1 flex-1 truncate">{d.name}</span>
                            <span className="font-medium text-foreground">{d.value.toLocaleString('ca-ES')}</span>
                            <span className="text-muted-foreground-2">({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ChartWrapper>
              );
            })()}
          </Card>

          {/* Action required donut */}
          <Card>
            <CardHeader><CardTitle>Acció requerida</CardTitle></CardHeader>
            {enrichedLoading ? <Skeleton className="h-52 w-full" /> : (() => {
              const actionPie = ACTION_ORDER
                .map(k => ({ name: actionMeta(k).label, value: enriched?.by_action.find(a => a.key === k)?.count ?? 0, hex: ACTION_META[k]?.hex ?? '#94a3b8' }))
                .filter(d => d.value > 0);
              const total = actionPie.reduce((s, x) => s + x.value, 0);
              return (
                <ChartWrapper
                  title="accio-requerida"
                  csvData={actionPie.map(d => ({ Accio: d.name, Missatges: d.value, 'Percentatge (%)': total > 0 ? (d.value / total * 100).toFixed(1) : '0' }))}
                >
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={actionPie} cx="50%" cy="50%" innerRadius={48} outerRadius={78} dataKey="value" paddingAngle={2}>
                          {actionPie.map((d, i) => <Cell key={i} fill={d.hex} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [v.toLocaleString('ca-ES'), 'Missatges']}
                          contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {actionPie.map(d => {
                        const pct = total > 0 ? (d.value / total * 100).toFixed(0) : '0';
                        return (
                          <div key={d.name} className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.hex }} />
                            <span className="text-muted-foreground-1 flex-1 truncate">{d.name}</span>
                            <span className="font-medium text-foreground">{d.value.toLocaleString('ca-ES')}</span>
                            <span className="text-muted-foreground-2">({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ChartWrapper>
              );
            })()}
          </Card>
        </div>

        {/* Row 2: Dept bar + Experience signal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dept horizontal bar */}
          <Card>
            <CardHeader><CardTitle>Missatges per departament</CardTitle></CardHeader>
            {enrichedLoading ? <Skeleton className="h-64 w-full" /> : (() => {
              const deptData = (enriched?.by_department ?? []).slice(0, 10).map(d => ({
                name: deptMeta(d.dept).label,
                count: d.count,
                hex: deptMeta(d.dept).hex,
              }));
              return (
                <ChartWrapper
                  title="missatges-departament"
                  csvData={deptData.map(d => ({ Departament: d.name, Missatges: d.count }))}
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => [v.toLocaleString('ca-ES'), 'Missatges']}
                        contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={13}>
                        {deptData.map((d, i) => <Cell key={i} fill={d.hex} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              );
            })()}
          </Card>

          {/* Experience signal bars + language pills */}
          <Card>
            <CardHeader><CardTitle>Experiència ciutadana i idioma</CardTitle></CardHeader>
            {enrichedLoading ? <Skeleton className="h-64 w-full" /> : (() => {
              const expBar = EXP_ORDER
                .map(k => ({ name: experienceMeta(k).label, value: enriched?.by_experience.find(e => e.key === k)?.count ?? 0, hex: experienceMeta(k).hex }))
                .filter(d => d.value > 0);
              const langData = enriched?.by_language ?? [];
              const expTotal = expBar.reduce((s, x) => s + x.value, 0);
              return (
                <div className="space-y-5 pt-1">
                  <div className="space-y-3">
                    {expBar.map(d => {
                      const pct = expTotal > 0 ? (d.value / expTotal) * 100 : 0;
                      return (
                        <div key={d.name}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-foreground">{d.name}</span>
                            <span className="text-muted-foreground-2">{d.value.toLocaleString('ca-ES')} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="h-2 bg-muted-hover rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.hex }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-card-line pt-4">
                    <p className="text-xs font-medium text-muted-foreground-2 mb-2 uppercase tracking-wide">Distribució per idioma</p>
                    <div className="flex gap-2 flex-wrap">
                      {langData.map(l => {
                        const m = languageMeta(l.key);
                        return (
                          <div key={l.key} className={cn('flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl text-xs font-semibold', m.bg, m.text)}>
                            <span className="text-lg font-extrabold">{l.pct.toFixed(0)}%</span>
                            <span>{m.label}</span>
                            <span className="font-normal opacity-70">{l.count.toLocaleString('ca-ES')} msg</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>

        {/* Row 3: Followup rate by dept (stacked: followup vs no followup) + global followup KPI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stacked bar: followup vs total per dept */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>Taxa de seguiment pendent per departament</CardTitle></CardHeader>
              {enrichedLoading ? <Skeleton className="h-64 w-full" /> : (() => {
                const deptFollowup = (enriched?.by_department ?? []).slice(0, 8).map(d => ({
                  name: deptMeta(d.dept).label,
                  pendent: d.followup_count,
                  resolt: d.count - d.followup_count,
                  hex: deptMeta(d.dept).hex,
                })).sort((a, b) => (b.pendent / (b.pendent + b.resolt)) - (a.pendent / (a.pendent + a.resolt)));
                return (
                  <ChartWrapper
                    title="seguiment-departament"
                    csvData={deptFollowup.map(d => ({ Departament: d.name, Pendent: d.pendent, 'Sense_seguiment': d.resolt }))}
                  >
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={deptFollowup} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(v: number, name: string) => [v.toLocaleString('ca-ES'), name === 'pendent' ? 'Pendent' : 'Resolt']}
                          contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === 'pendent' ? 'Pendent' : 'Sense seguiment'} />
                        <Bar dataKey="pendent" stackId="a" fill="#ef4444" barSize={13} radius={[0, 0, 0, 0]} name="pendent" />
                        <Bar dataKey="resolt" stackId="a" fill="#e2e8f0" barSize={13} radius={[0, 4, 4, 0]} name="resolt" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartWrapper>
                );
              })()}
            </Card>
          </div>

          {/* Global followup KPI */}
          <Card>
            <CardHeader><CardTitle>Seguiment global</CardTitle></CardHeader>
            {enrichedLoading ? <Skeleton className="h-64 w-full" /> : (
              <div className="flex flex-col items-center justify-center gap-4 py-4 h-full">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="12"
                      strokeDasharray={`${2 * Math.PI * 40 * (enriched?.followup_pct ?? 0) / 100} ${2 * Math.PI * 40}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold text-red-600">{(enriched?.followup_pct ?? 0).toFixed(0)}%</span>
                    <span className="text-[9px] text-muted-foreground-2">del total</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-foreground">{enriched?.followup_count.toLocaleString('ca-ES') ?? '—'}</p>
                  <p className="text-xs text-muted-foreground-2">missatges pendents</p>
                </div>
                <div className="w-full border-t border-card-line pt-3 space-y-1">
                  {(enriched?.by_department ?? []).slice(0, 3).map(d => (
                    <div key={d.dept} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground-1 truncate flex-1">{deptMeta(d.dept).label}</span>
                      <span className={cn('font-bold ml-2', d.followup_pct > 70 ? 'text-red-600' : d.followup_pct > 50 ? 'text-amber-600' : 'text-emerald-600')}>
                        {d.followup_pct.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

export default function EstadistiquesPage() {
  return (
    <Suspense>
      <EstadistiquesPageInner />
    </Suspense>
  );
}
