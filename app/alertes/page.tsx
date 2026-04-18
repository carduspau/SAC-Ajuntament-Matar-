'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from 'recharts';
import { AlertTriangle, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { ChartWrapper } from '@/components/ui/ChartWrapper';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { MessageDetail } from '@/components/missatges/MessageDetail';
import { supabase } from '@/lib/supabase';
import { parseSentiment } from '@/lib/sentiment';
import { formatDate, truncate, cn } from '@/lib/utils';
import { computeTimeline } from '@/lib/aggregations';
import { getCategoryColor } from '@/lib/categoryColors';
import { useDateRange } from '@/context/DateRangeContext';
import type { SacMessage, TimelineBucket, CategoryStat, TimelineGranularity } from '@/types';
import { format, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';

const AlertesMapDynamic = dynamic(
  () => import('@/components/alertes/AlertesMap').then(m => ({ default: m.AlertesMap })),
  { ssr: false, loading: () => <Skeleton className="w-full h-full rounded-xl min-h-[200px]" /> }
);

type SeverityFilter = 'all' | 'critical' | 'very-critical';

const TABS: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'Tots' },
  { value: 'very-critical', label: 'Molt crític (< 2.5)' },
  { value: 'critical', label: 'Crític (2.5–3.5)' },
];

function formatBucket(bucket: string, granularity: TimelineGranularity): string {
  try {
    const d = bucket.includes('T') ? parseISO(bucket) : new Date(bucket + 'T00:00:00');
    switch (granularity) {
      case 'hour':  return format(d, 'HH:mm', { locale: ca });
      case 'day':   return format(d, 'd MMM', { locale: ca });
      case 'week':  return format(d, 'd MMM', { locale: ca });
      case 'month': return format(d, 'MMM yy', { locale: ca });
    }
  } catch { return bucket; }
}

function AlertRow({ alert, onClick }: { alert: SacMessage; onClick: () => void }) {
  const score = parseSentiment(alert.sentiment);

  return (
    <div
      className="flex items-start gap-3 p-4 border border-card-line rounded-xl cursor-pointer hover:bg-muted-hover transition-colors"
      onClick={onClick}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
        score !== null && score < 2.5 ? 'bg-red-100' : 'bg-amber-100'
      }`}>
        <span className={`text-sm font-bold ${
          score !== null && score < 2.5 ? 'text-red-600' : 'text-amber-600'
        }`}>
          {score !== null ? score.toFixed(1) : '—'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">{alert.barri ?? '—'}</span>
          {alert.clas1 && <Badge variant="info" className="text-xs">{alert.clas1}</Badge>}
          {alert.canal && <Badge variant="neutral" className="text-xs">{alert.canal}</Badge>}
          <span className="text-xs text-muted-foreground-2 ml-auto">{formatDate(alert.data_inici, 'dd/MM/yyyy')}</span>
        </div>
        <p className="text-sm text-muted-foreground-1 line-clamp-2">{truncate(alert.message, 140)}</p>
      </div>
    </div>
  );
}

export default function AlertesPage() {
  const { from, to, granularity } = useDateRange();
  const [allCritical, setAllCritical] = useState<SacMessage[]>([]);
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [byCategory, setByCategory] = useState<CategoryStat[]>([]);
  const [avgSentiment, setAvgSentiment] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [selectedMessage, setSelectedMessage] = useState<SacMessage | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('sac_messages')
        .select('*')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString())
        .limit(2000);

      const critical = (data ?? []).filter((m: SacMessage) => {
        const s = parseSentiment(m.sentiment);
        return s !== null && s < 3.5;
      });

      const tl = computeTimeline(critical, granularity);

      const sentiments = critical
        .map(m => parseSentiment(m.sentiment))
        .filter((s): s is number => s !== null);
      const avg = sentiments.length > 0
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : null;

      const catMap = new Map<string, number>();
      for (const m of critical) {
        const cat = m.clas1 ?? 'Altres';
        catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
      }
      const cats = Array.from(catMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      setAllCritical(critical);
      setTimeline(tl);
      setAvgSentiment(avg);
      setByCategory(cats);
    } catch {
      setAllCritical([]);
      setTimeline([]);
      setAvgSentiment(null);
      setByCategory([]);
    } finally {
      setLoading(false);
    }
  }, [from.toISOString(), to.toISOString(), granularity]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = allCritical.filter(a => {
    const s = parseSentiment(a.sentiment);
    if (filter === 'very-critical') return s !== null && s < 2.5;
    if (filter === 'critical') return s !== null && s >= 2.5 && s < 3.5;
    return true;
  });

  const chartData = timeline.map(d => ({ b: d.bucket, v: d.count }));
  const sentData = timeline.filter(d => d.avg_sentiment !== null).map(d => ({ b: d.bucket, v: d.avg_sentiment! }));

  const sentCat =
    avgSentiment === null  ? { label: '—',      accent: '#94a3b8', textCls: 'text-muted-foreground-2', badgeBg: 'bg-muted-hover' } :
    avgSentiment >= 6      ? { label: 'Positiu', accent: '#10b981', textCls: 'text-emerald-600',        badgeBg: 'bg-emerald-50'  } :
    avgSentiment >= 3.5    ? { label: 'Neutre',  accent: '#f59e0b', textCls: 'text-amber-500',          badgeBg: 'bg-amber-50'    } :
                             { label: 'Negatiu', accent: '#ef4444', textCls: 'text-red-500',            badgeBg: 'bg-red-50'      };

  const catData = byCategory.slice(0, 10).map(c => ({
    category: c.category.length > 28 ? c.category.slice(0, 28) + '…' : c.category,
    fullCategory: c.category,
    count: c.count,
  }));

  return (
    <div className="space-y-6">

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left top: 2 mini cards */}
        <div className="lg:col-span-2 lg:row-start-1 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Critical messages timeline card */}
          <div className="bg-card border border-card-line rounded-2xl p-5 flex flex-col shadow-xs">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground-2">Alertes crítiques</p>
            </div>
            {loading ? (
              <>
                <Skeleton className="h-10 w-24 mb-4" />
                <Skeleton className="flex-1 w-full" style={{ minHeight: 80 }} />
              </>
            ) : (
              <>
                <p className="text-[2.4rem] font-extrabold tracking-tight text-red-600 leading-none mb-4">
                  {allCritical.length.toLocaleString('ca-ES')}
                </p>
                {chartData.length >= 2 ? (
                  <ChartWrapper
                    title="alertes-critiques-evolucio"
                    csvData={chartData.map(d => ({ Data: formatBucket(d.b, granularity), Alertes: d.v }))}
                    className="flex-1 min-h-[80px] -mx-5"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="grad-crit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="bg-card border border-card-line rounded-lg px-2.5 py-1.5 shadow-xs text-xs">
                                <p className="text-muted-foreground-2 mb-0.5">{formatBucket((payload[0].payload as { b: string }).b, granularity)}</p>
                                <p className="font-bold text-foreground">{payload[0].value as number} alertes</p>
                              </div>
                            );
                          }}
                          cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '3 3' }}
                        />
                        <Area type="monotone" dataKey="v" stroke="#ef4444" strokeWidth={2} fill="url(#grad-crit)" dot={false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartWrapper>
                ) : (
                  <div className="flex-1 min-h-[80px] flex items-center justify-center">
                    <span className="text-xs text-muted-foreground-2">Sense dades temporals</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sentiment card */}
          <div className="bg-card border border-card-line rounded-2xl p-5 flex flex-col shadow-xs">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sentCat.accent }} />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground-2">Sentiment crític</p>
              </div>
              {!loading && avgSentiment !== null && (
                <span className={cn('text-xs font-semibold px-2 py-1 rounded-full shrink-0', sentCat.badgeBg, sentCat.textCls)}>
                  {sentCat.label}
                </span>
              )}
            </div>
            {loading ? (
              <>
                <Skeleton className="h-10 w-28 mb-4" />
                <Skeleton className="flex-1 w-full" style={{ minHeight: 60 }} />
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <p className="text-[2.4rem] font-extrabold tracking-tight text-foreground leading-none">
                    {avgSentiment !== null ? avgSentiment.toFixed(2) : '—'}
                  </p>
                  {avgSentiment !== null && (
                    <span className="text-base font-medium text-muted-foreground-2">/10</span>
                  )}
                </div>
                {sentData.length >= 2 ? (
                  <ChartWrapper
                    title="sentiment-critic-evolucio"
                    csvData={sentData.map(d => ({ Data: formatBucket(d.b, granularity), 'Sentiment_mitja': (d.v as number).toFixed(2) }))}
                    className="flex-1 min-h-[60px] -mx-5"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sentData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="grad-sent-crit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={sentCat.accent} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={sentCat.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="bg-card border border-card-line rounded-lg px-2.5 py-1.5 shadow-xs text-xs">
                                <p className="text-muted-foreground-2 mb-0.5">{formatBucket((payload[0].payload as { b: string }).b, granularity)}</p>
                                <p className="font-bold text-foreground">{(payload[0].value as number).toFixed(2)} / 10</p>
                              </div>
                            );
                          }}
                          cursor={{ stroke: sentCat.accent, strokeWidth: 1, strokeDasharray: '3 3' }}
                        />
                        <Area type="monotone" dataKey="v" stroke={sentCat.accent} strokeWidth={2} fill="url(#grad-sent-crit)" dot={false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartWrapper>
                ) : (
                  <div className="flex-1 min-h-[60px]" />
                )}
              </>
            )}
          </div>
        </div>

        {/* Left bottom: categories bar chart */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-2">
          <Card>
            <CardHeader>
              <CardTitle>Categories de les alertes crítiques</CardTitle>
            </CardHeader>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : catData.length === 0 ? (
              <p className="text-sm text-muted-foreground-2 text-center py-12">Sense dades</p>
            ) : (
              <ChartWrapper
                title="categories-alertes-critiques"
                csvData={byCategory.slice(0, 10).map(d => ({ Categoria: d.category, Alertes: d.count }))}
              >
                <ResponsiveContainer width="100%" height={Math.max(200, catData.length * 28 + 16)}>
                  <BarChart data={catData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      width={200}
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(value: number) => [value.toLocaleString('ca-ES'), 'Alertes']}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                      {catData.map((d, i) => (
                        <Cell key={i} fill={getCategoryColor(d.fullCategory)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            )}
          </Card>
        </div>

        {/* Right: map spanning both left rows */}
        <div className="lg:col-start-3 lg:row-start-1 lg:row-span-2 flex flex-col">
          <Card padding={false} className="overflow-hidden flex flex-col flex-1 min-h-[400px]">
            <CardHeader className="px-4 py-3 border-b border-card-line shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-red-500" />
                Localització de les alertes
              </CardTitle>
            </CardHeader>
            <div className="flex-1 min-h-0">
              {loading ? (
                <Skeleton className="w-full h-full min-h-[360px]" />
              ) : (
                <AlertesMapDynamic alerts={filtered} onSelect={setSelectedMessage} />
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Full-width alert list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3 w-full">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Llistat d'alertes
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={cn(
                    'py-1.5 px-3 inline-flex items-center text-sm font-medium rounded-lg transition-colors',
                    filter === tab.value
                      ? 'bg-primary text-primary-foreground border border-primary-line'
                      : 'bg-layer border border-layer-line text-layer-foreground shadow-2xs hover:bg-layer-hover'
                  )}
                >
                  {tab.label}
                </button>
              ))}
              <span className="text-sm text-muted-foreground">{filtered.length} alertes</span>
            </div>
          </div>
        </CardHeader>
        <div className="space-y-3">
          {loading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-emerald-600 text-xl">✓</span>
              </div>
              <p className="text-muted-foreground">No hi ha alertes amb aquests criteris</p>
            </div>
          ) : (
            filtered.slice(0, 30).map(alert => (
              <AlertRow key={alert.id} alert={alert} onClick={() => setSelectedMessage(alert)} />
            ))
          )}
        </div>
      </Card>

      <MessageDetail message={selectedMessage} onClose={() => setSelectedMessage(null)} />
    </div>
  );
}
