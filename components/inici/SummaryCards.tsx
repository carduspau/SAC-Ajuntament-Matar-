'use client';

import React from 'react';
import {
  AreaChart, Area, ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { ca } from 'date-fns/locale';
import type { StatsResponse, TimelineBucket, TimelineGranularity } from '@/types';

// ─── Shared primitives ────────────────────────────────────────────────────────

function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'bg-card border border-card-line rounded-2xl p-5 flex flex-col shadow-xs h-full',
      className,
    )}>
      {children}
    </div>
  );
}

function CardLabel({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {accent && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground-2">
        {children}
      </p>
    </div>
  );
}

function formatBucketShort(bucket: string, granularity: TimelineGranularity): string {
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

// ─── 1. MISSATGES ─────────────────────────────────────────────────────────────

interface MissatgesCardProps {
  stats: StatsResponse | null;
  timeline: TimelineBucket[];
  loading: boolean;
  granularity: TimelineGranularity;
  from: Date;
  to: Date;
}

export function MissatgesCard({ stats, timeline, loading, granularity, from, to }: MissatgesCardProps) {
  if (loading) {
    return (
      <CardShell>
        <Skeleton className="h-3 w-28 mb-3" />
        <Skeleton className="h-10 w-24 mb-4" />
        <Skeleton className="flex-1 w-full mb-2 rounded-xl" style={{ minHeight: 80 }} />
        <Skeleton className="h-3 w-full mt-2" />
        <Skeleton className="h-12 w-full mt-4" />
      </CardShell>
    );
  }

  const total = stats?.total ?? 0;
  const chartData = timeline.map(d => ({ b: d.bucket, v: d.count }));
  const hasTrend = chartData.length >= 2;

  const dayCount = differenceInCalendarDays(to, from) + 1;
  const dailyAvg = dayCount > 0 ? Math.round(total / dayCount) : 0;

  let trendPct: number | null = null;
  if (hasTrend && timeline.length >= 4) {
    const mid = Math.floor(timeline.length / 2);
    const firstHalf = timeline.slice(0, mid).reduce((s, d) => s + d.count, 0) / mid;
    const secondHalf = timeline.slice(mid).reduce((s, d) => s + d.count, 0) / (timeline.length - mid);
    if (firstHalf > 0) trendPct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
  }

  const firstLabel = hasTrend ? formatBucketShort(timeline[0].bucket, granularity) : '';
  const lastLabel  = hasTrend ? formatBucketShort(timeline[timeline.length - 1].bucket, granularity) : '';

  // Custom tooltip
  function MsgTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: { b: string } }[] }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-card-line rounded-lg px-2.5 py-1.5 shadow-xs text-xs">
        <p className="text-muted-foreground-2 mb-0.5">{formatBucketShort(payload[0].payload.b, granularity)}</p>
        <p className="font-bold text-foreground">{payload[0].value.toLocaleString('ca-ES')} missatges</p>
      </div>
    );
  }

  return (
    <CardShell>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <CardLabel accent="#2563eb">Total missatges</CardLabel>
        {trendPct !== null && (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
            trendPct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
          )}>
            {trendPct >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {Math.abs(trendPct)}%
          </span>
        )}
      </div>

      {/* Big number */}
      <p className="text-[2.4rem] font-extrabold tracking-tight text-foreground leading-none mb-4">
        {total.toLocaleString('ca-ES')}
      </p>

      {/* Chart — grows to fill */}
      {hasTrend ? (
        <div className="flex-1 min-h-0 -mx-5 flex flex-col">
          <div className="flex-1 min-h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="sc-grad-msg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <RechartsTooltip
                  content={<MsgTooltip />}
                  cursor={{ stroke: '#2563eb', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#sc-grad-msg)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between px-5 pt-1.5 pb-3">
            <span className="text-[10px] text-muted-foreground-2">{firstLabel}</span>
            <span className="text-[10px] text-muted-foreground-2">{lastLabel}</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-[80px] mb-3 flex items-center justify-center">
          <span className="text-xs text-muted-foreground-2">Sense dades temporals</span>
        </div>
      )}

      {/* Footer — 2 KPIs: daily avg + trend */}
      <div className="flex items-stretch pt-4 border-t border-card-line">
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground-2 mb-1">Mitjana diaria</p>
          <p className="text-sm font-bold text-foreground">{dailyAvg.toLocaleString('ca-ES')}</p>
        </div>
        {trendPct !== null && (
          <>
            <div className="w-px bg-card-line mx-3" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground-2 mb-1">Tendència</p>
              <p className={cn(
                'text-sm font-bold flex items-center gap-1',
                trendPct >= 0 ? 'text-emerald-600' : 'text-red-500',
              )}>
                {trendPct >= 0
                  ? <TrendingUp className="w-3.5 h-3.5" />
                  : <TrendingDown className="w-3.5 h-3.5" />}
                {trendPct >= 0 ? 'Alça' : 'Baixa'} {Math.abs(trendPct)}%
              </p>
            </div>
          </>
        )}
      </div>
    </CardShell>
  );
}

// ─── 2. SENTIMENT ─────────────────────────────────────────────────────────────

interface SentimentCardProps {
  stats: StatsResponse | null;
  timeline: TimelineBucket[];
  loading: boolean;
  granularity: TimelineGranularity;
}

export function SentimentCard({ stats, timeline, loading, granularity }: SentimentCardProps) {
  if (loading) {
    return (
      <CardShell>
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-10 w-28 mb-4" />
        <Skeleton className="flex-1 w-full rounded-xl mb-4" style={{ minHeight: 60 }} />
        <div className="space-y-3 pt-4 border-t border-card-line">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </CardShell>
    );
  }

  const avg = stats?.avg_sentiment ?? null;

  const sentCat =
    avg === null ? { label: '—',       textCls: 'text-muted-foreground-2', badgeBg: 'bg-muted-hover', accent: '#94a3b8' } :
    avg >= 6     ? { label: 'Positiu',  textCls: 'text-emerald-600',        badgeBg: 'bg-emerald-50',  accent: '#10b981' } :
    avg >= 3.5   ? { label: 'Neutre',   textCls: 'text-amber-500',          badgeBg: 'bg-amber-50',    accent: '#f59e0b' } :
                   { label: 'Negatiu',  textCls: 'text-red-500',            badgeBg: 'bg-red-50',      accent: '#ef4444' };

  const dist = stats?.sentiment_distribution ?? [];
  const negatiu = dist.filter(d => ['0–1','1–2','2–3','3–4'].includes(d.range)).reduce((s, d) => s + d.count, 0);
  const neutre  = dist.filter(d => ['4–5','5–6'].includes(d.range)).reduce((s, d) => s + d.count, 0);
  const positiu = dist.filter(d => ['6–7','7–8','8–9','9–10'].includes(d.range)).reduce((s, d) => s + d.count, 0);
  const distTotal = negatiu + neutre + positiu || 1;

  const bars = [
    { label: 'Positiu', count: positiu, pct: (positiu / distTotal) * 100, barColor: '#10b981', txt: 'text-emerald-600' },
    { label: 'Neutre',  count: neutre,  pct: (neutre  / distTotal) * 100, barColor: '#f59e0b', txt: 'text-amber-500'  },
    { label: 'Negatiu', count: negatiu, pct: (negatiu / distTotal) * 100, barColor: '#ef4444', txt: 'text-red-500'    },
  ];

  const sentChartData = timeline
    .filter(d => d.avg_sentiment !== null)
    .map(d => ({ b: d.bucket, v: d.avg_sentiment! }));
  const hasTrend = sentChartData.length >= 2;
  const sentColor = sentCat.accent;

  function SentTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: { b: string } }[] }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-card-line rounded-lg px-2.5 py-1.5 shadow-xs text-xs">
        <p className="text-muted-foreground-2 mb-0.5">{formatBucketShort(payload[0].payload.b, granularity)}</p>
        <p className="font-bold text-foreground">{payload[0].value.toFixed(2)} / 10</p>
      </div>
    );
  }

  return (
    <CardShell>
      {/* Header row — label + sentiment badge */}
      <div className="flex items-start justify-between mb-3">
        <CardLabel accent={sentCat.accent}>Sentiment del període</CardLabel>
        <span className={cn('text-xs font-semibold px-2 py-1 rounded-full shrink-0', sentCat.badgeBg, sentCat.textCls)}>
          {sentCat.label}
        </span>
      </div>

      {/* Big number with /10 context */}
      <div className="flex items-baseline gap-1.5 mb-4">
        <p className="text-[2.4rem] font-extrabold tracking-tight text-foreground leading-none">
          {avg !== null ? avg.toFixed(2) : '—'}
        </p>
        {avg !== null && (
          <span className="text-base font-medium text-muted-foreground-2">/10</span>
        )}
      </div>

      {/* Sparkline — grows to fill */}
      {hasTrend ? (
        <div className="flex-1 min-h-[60px] -mx-5 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sentChartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sc-grad-sent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={sentColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={sentColor} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <RechartsTooltip
                content={<SentTooltip />}
                cursor={{ stroke: sentColor, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={sentColor}
                strokeWidth={2}
                fill="url(#sc-grad-sent)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 min-h-[60px] mb-4" />
      )}

      {/* Breakdown bars — count + percentage, no footer */}
      <div className="space-y-2.5 pt-4 border-t border-card-line">
        {bars.map(b => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground-1 w-14 shrink-0">{b.label}</span>
            <div className="flex-1 h-1.5 bg-muted-hover rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${b.pct}%`, backgroundColor: b.barColor }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground-2 tabular-nums w-10 text-right shrink-0">
              {b.count.toLocaleString('ca-ES')}
            </span>
            <span className={cn('text-xs font-semibold w-7 text-right tabular-nums shrink-0', b.txt)}>
              {b.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

// ─── 3. ALERTES CRÍTIQUES ─────────────────────────────────────────────────────

interface AlertesCardProps {
  stats: StatsResponse | null;
  loading: boolean;
}

export function AlertesCard({ stats, loading }: AlertesCardProps) {
  if (loading) {
    return (
      <CardShell>
        <Skeleton className="h-3 w-32 mb-3" />
        <Skeleton className="h-10 w-24 mb-5" />
        <div className="flex-1 space-y-2 pt-4 border-t border-card-line">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
        </div>
      </CardShell>
    );
  }

  const criticalCount = stats?.critical_count ?? 0;
  // Sort by most critical messages (DESC), not by avg_sentiment
  const criticalBarris = (stats?.by_barri ?? [])
    .filter(b => b.critical_count > 0)
    .sort((a, b) => b.critical_count - a.critical_count)
    .slice(0, 5);
  const barrisCount = criticalBarris.length;
  const isOk = criticalCount === 0;

  return (
    <CardShell>
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <CardLabel accent={isOk ? '#10b981' : '#ef4444'}>Alertes crítiques</CardLabel>
        {!isOk && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
      </div>

      {/* Big number + inline subtitle */}
      <div className="flex items-baseline gap-2 mb-4">
        <p className={cn(
          'text-[2.4rem] font-extrabold tracking-tight leading-none',
          isOk ? 'text-emerald-600' : 'text-red-600',
        )}>
          {criticalCount.toLocaleString('ca-ES')}
        </p>
        <span className="text-xs text-muted-foreground">
          {isOk ? 'sense alertes' : `missatges · ${barrisCount} barri${barrisCount !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Critical barris list — grows to fill */}
      <div className="flex-1 min-h-0 space-y-2 pt-4 border-t border-card-line">
        {isOk ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground-2">Tots els barris en rang normal</p>
          </div>
        ) : (
          criticalBarris.map(b => (
            <div key={b.barri} className="flex items-center justify-between bg-background-1 border border-card-line rounded-xl px-3 py-2.5 hover:bg-red-50 transition-colors">
              <div className="flex items-center gap-2 min-w-0 mr-2">
                <span
                  className="w-1.5 h-5 rounded-full shrink-0"
                  style={{
                    backgroundColor: b.avg_sentiment !== null
                      ? (b.avg_sentiment < 2.5 ? '#ef4444' : b.avg_sentiment < 3.5 ? '#f97316' : '#f59e0b')
                      : '#94a3b8',
                  }}
                />
                <span className="text-xs font-medium text-foreground truncate">{b.barri}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground-2 tabular-nums">{b.critical_count} crítics</span>
                {b.avg_sentiment !== null && (
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded tabular-nums">
                    {b.avg_sentiment.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </CardShell>
  );
}

// ─── 4. TOP CATEGORIES ────────────────────────────────────────────────────────

interface CategoriesCardProps {
  stats: StatsResponse | null;
  loading: boolean;
}

const CATEGORY_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706'];

export function CategoriesCard({ stats, loading }: CategoriesCardProps) {
  if (loading) {
    return (
      <CardShell>
        <Skeleton className="h-3 w-28 mb-3" />
        <Skeleton className="h-14 w-full rounded-xl mb-4" />
        <div className="flex-1 space-y-3 pt-4 border-t border-card-line">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      </CardShell>
    );
  }

  const top5 = stats?.by_clas1.slice(0, 5) ?? [];
  const maxCount = top5[0]?.count ?? 1;
  const totalMessages = stats?.total ?? 1;
  const totalCategories = stats?.by_clas1.length ?? 0;

  return (
    <CardShell>
      <div className="flex items-start justify-between mb-3">
        <CardLabel accent="#7c3aed">Top categories</CardLabel>
        <span className="text-[10px] font-semibold text-muted-foreground-2 bg-muted-hover px-1.5 py-0.5 rounded-md">
          {totalCategories} total
        </span>
      </div>

      <div className="rounded-xl px-3 py-2.5 mb-4 bg-primary/5 border border-primary/10">
        <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">
          {top5[0]?.category ?? '—'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground-2">
            {top5[0]?.count.toLocaleString('ca-ES')} missatges
          </span>
          <span className="text-[10px] font-semibold text-primary">
            {top5[0] ? ((top5[0].count / totalMessages) * 100).toFixed(1) : '0'}%
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-between pt-4 border-t border-card-line">
        {top5.map((cat, i) => {
          const pct = (cat.count / maxCount) * 100;
          const pctOfTotal = ((cat.count / totalMessages) * 100).toFixed(1);
          const short = cat.category.length > 24
            ? cat.category.slice(0, 24) + '…'
            : cat.category;
          return (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0 mr-2">
                  <span
                    className="text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: CATEGORY_COLORS[i] }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs text-foreground truncate">{short}</span>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground-1 shrink-0 tabular-nums">
                  {pctOfTotal}%
                </span>
              </div>
              <div className="h-1.5 bg-muted-hover rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[i] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}
