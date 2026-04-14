'use client';

import React from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';
import type { StatsResponse, TimelineBucket, TimelineGranularity } from '@/types';

// ─── Shared primitives ────────────────────────────────────────────────────────

function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-card border border-card-line rounded-2xl p-5 flex flex-col', className)}>
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground-2 mb-3">
      {children}
    </p>
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
}

export function MissatgesCard({ stats, timeline, loading, granularity }: MissatgesCardProps) {
  if (loading) {
    return (
      <CardShell className="gap-0">
        <Skeleton className="h-3 w-28 mb-3" />
        <Skeleton className="h-10 w-24 mb-5" />
        <Skeleton className="h-16 w-full mb-2" />
        <Skeleton className="h-3 w-full" />
      </CardShell>
    );
  }

  const total = stats?.total ?? 0;
  const chartData = timeline.map(d => ({ b: d.bucket, v: d.count }));
  const hasTrend = chartData.length >= 2;

  const avgPerBucket = timeline.length > 0 ? Math.round(total / timeline.length) : 0;
  const peakBucket   = timeline.length > 0
    ? timeline.reduce((best, d) => d.count > best.count ? d : best)
    : null;

  const firstLabel = hasTrend ? formatBucketShort(timeline[0].bucket, granularity) : '';
  const lastLabel  = hasTrend ? formatBucketShort(timeline[timeline.length - 1].bucket, granularity) : '';

  return (
    <CardShell className="gap-0">
      <CardLabel>Total missatges</CardLabel>

      {/* Big number */}
      <p className="text-[2.2rem] font-bold tracking-tight text-foreground leading-none mb-5">
        {total.toLocaleString('ca-ES')}
      </p>

      {/* Full-bleed area chart */}
      {hasTrend ? (
        <div className="-mx-5">
          <ResponsiveContainer width="100%" height={68}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sc-grad-msg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <RechartsTooltip
                contentStyle={{ display: 'none' }}
                cursor={{ stroke: '#2563eb', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Area
                dataKey="v"
                stroke="#2563eb"
                strokeWidth={1.5}
                fill="url(#sc-grad-msg)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between px-5 mt-1 mb-4">
            <span className="text-[10px] text-muted-foreground-2">{firstLabel}</span>
            <span className="text-[10px] text-muted-foreground-2">{lastLabel}</span>
          </div>
        </div>
      ) : (
        <div className="h-16 mb-4 flex items-center justify-center">
          <span className="text-xs text-muted-foreground-2">Sense dades temporals</span>
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-stretch gap-0 pt-4 border-t border-card-line">
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground-2 mb-0.5">Mitjana / {granularity === 'hour' ? 'hora' : granularity === 'day' ? 'dia' : granularity === 'week' ? 'setmana' : 'mes'}</p>
          <p className="text-sm font-bold text-foreground">{avgPerBucket.toLocaleString('ca-ES')}</p>
        </div>
        {peakBucket && (
          <>
            <div className="w-px bg-card-line mx-3" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground-2 mb-0.5">Pic</p>
              <p className="text-sm font-bold text-foreground">{peakBucket.count.toLocaleString('ca-ES')}</p>
            </div>
            <div className="w-px bg-card-line mx-3" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground-2 mb-0.5">Data del pic</p>
              <p className="text-sm font-bold text-foreground">{formatBucketShort(peakBucket.bucket, granularity)}</p>
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
      <CardShell className="gap-0">
        <Skeleton className="h-3 w-24 mb-3" />
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </CardShell>
    );
  }

  const avg = stats?.avg_sentiment ?? null;

  // Category label + colors
  const sentCat =
    avg === null       ? { label: '—',       textCls: 'text-muted-foreground-2', bgCls: 'bg-muted-hover' } :
    avg >= 6           ? { label: 'Positiu',  textCls: 'text-emerald-600',        bgCls: 'bg-emerald-50'  } :
    avg >= 3.5         ? { label: 'Neutre',   textCls: 'text-amber-500',          bgCls: 'bg-amber-50'    } :
                         { label: 'Negatiu',  textCls: 'text-red-500',            bgCls: 'bg-red-50'      };

  // 3-way breakdown from distribution buckets (each bucket = 1 point range)
  const dist = stats?.sentiment_distribution ?? [];
  const negatiu = dist.filter(d => ['0–1','1–2','2–3','3–4'].includes(d.range)).reduce((s, d) => s + d.count, 0);
  const neutre  = dist.filter(d => ['4–5','5–6'].includes(d.range)).reduce((s, d) => s + d.count, 0);
  const positiu = dist.filter(d => ['6–7','7–8','8–9','9–10'].includes(d.range)).reduce((s, d) => s + d.count, 0);
  const distTotal = negatiu + neutre + positiu || 1;

  const bars = [
    { label: 'Positiu', count: positiu, pct: (positiu / distTotal) * 100, bar: 'bg-emerald-500', txt: 'text-emerald-600' },
    { label: 'Neutre',  count: neutre,  pct: (neutre  / distTotal) * 100, bar: 'bg-amber-400',  txt: 'text-amber-500'  },
    { label: 'Negatiu', count: negatiu, pct: (negatiu / distTotal) * 100, bar: 'bg-red-400',    txt: 'text-red-500'    },
  ];

  // Sentiment area chart (trend over time)
  const sentChartData = timeline
    .filter(d => d.avg_sentiment !== null)
    .map(d => ({ v: d.avg_sentiment! }));

  const hasTrend = sentChartData.length >= 2;
  const sentColor = avg !== null ? (avg >= 6 ? '#10b981' : avg >= 3.5 ? '#f59e0b' : '#ef4444') : '#94a3b8';

  return (
    <CardShell className="gap-0">
      <CardLabel>Sentiment del període</CardLabel>

      {/* Score + category badge */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[2.2rem] font-bold tracking-tight text-foreground leading-none">
          {avg !== null ? avg.toFixed(2) : '—'}
        </p>
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', sentCat.bgCls, sentCat.textCls)}>
          {sentCat.label}
        </span>
      </div>

      {/* Mini trend sparkline */}
      {hasTrend && (
        <div className="-mx-5 mb-4">
          <ResponsiveContainer width="100%" height={44}>
            <AreaChart data={sentChartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sc-grad-sent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={sentColor} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={sentColor} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <Area
                dataKey="v"
                stroke={sentColor}
                strokeWidth={1.5}
                fill="url(#sc-grad-sent)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdown bars */}
      <div className="space-y-2.5 pt-4 border-t border-card-line">
        {bars.map(b => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground-1 w-14 shrink-0">{b.label}</span>
            <div className="flex-1 h-1.5 bg-muted-hover rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', b.bar)}
                style={{ width: `${b.pct}%` }}
              />
            </div>
            <span className={cn('text-xs font-semibold w-8 text-right', b.txt)}>
              {b.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-3 text-[10px] text-muted-foreground-2">
        <span>{positiu.toLocaleString('ca-ES')} positius</span>
        <span>{negatiu.toLocaleString('ca-ES')} negatius</span>
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
      <CardShell className="gap-0">
        <Skeleton className="h-3 w-32 mb-3" />
        <Skeleton className="h-10 w-14 mb-5" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
        </div>
      </CardShell>
    );
  }

  const criticalCount = stats?.critical_count ?? 0;
  const criticalBarris = (stats?.by_barri ?? [])
    .filter(b => b.avg_sentiment !== null && b.avg_sentiment < 3.5)
    .sort((a, b) => (a.avg_sentiment ?? 10) - (b.avg_sentiment ?? 10))
    .slice(0, 4);

  return (
    <CardShell className="gap-0">
      <div className="flex items-center justify-between mb-3">
        <CardLabel>Alertes crítiques</CardLabel>
        {criticalCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
      </div>

      {/* Count */}
      <div className="flex items-baseline gap-2 mb-5">
        <p className={cn(
          'text-[2.2rem] font-bold tracking-tight leading-none',
          criticalCount > 0 ? 'text-red-600' : 'text-emerald-600'
        )}>
          {criticalCount.toLocaleString('ca-ES')}
        </p>
        <span className="text-xs text-muted-foreground">missatges</span>
      </div>

      {/* Critical barris list */}
      <div className="space-y-2 pt-4 border-t border-card-line">
        {criticalBarris.length === 0 ? (
          <div className="flex flex-col items-center py-4 gap-1">
            <span className="text-emerald-500 text-xl">✓</span>
            <p className="text-xs text-muted-foreground-2">Cap alerta crítica</p>
          </div>
        ) : (
          criticalBarris.map(b => (
            <div key={b.barri} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <span className="text-xs font-medium text-foreground truncate flex-1 min-w-0 mr-2">{b.barri}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground-2">{b.count} msg</span>
                <span className="text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                  {b.avg_sentiment?.toFixed(1)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <Link
        href="/alertes"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors mt-4"
      >
        Veure totes
        <ArrowUpRight className="w-3 h-3" />
      </Link>
    </CardShell>
  );
}

// ─── 4. TOP CATEGORIES ────────────────────────────────────────────────────────

interface CategoriesCardProps {
  stats: StatsResponse | null;
  loading: boolean;
}

const CATEGORY_BLUES = [
  '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
];

export function CategoriesCard({ stats, loading }: CategoriesCardProps) {
  if (loading) {
    return (
      <CardShell className="gap-0">
        <Skeleton className="h-3 w-28 mb-3" />
        <Skeleton className="h-6 w-16 mb-5" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      </CardShell>
    );
  }

  const top5 = stats?.by_clas1.slice(0, 5) ?? [];
  const maxCount = top5[0]?.count ?? 1;
  const totalCategories = stats?.by_clas1.length ?? 0;

  return (
    <CardShell className="gap-0">
      <div className="flex items-center justify-between mb-3">
        <CardLabel>Top categories</CardLabel>
        <span className="text-[10px] font-semibold text-muted-foreground-2 bg-muted-hover px-1.5 py-0.5 rounded-md">
          {totalCategories} total
        </span>
      </div>

      {/* Top category highlight */}
      <div className="mb-5">
        <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">
          {top5[0]?.category ?? '—'}
        </p>
        <p className="text-[10px] text-muted-foreground-2 mt-0.5">
          {top5[0]?.count.toLocaleString('ca-ES')} missatges · 1a categoria
        </p>
      </div>

      {/* Horizontal bars */}
      <div className="space-y-3 pt-4 border-t border-card-line">
        {top5.map((cat, i) => {
          const pct = (cat.count / maxCount) * 100;
          const short = cat.category.length > 26
            ? cat.category.slice(0, 26) + '…'
            : cat.category;
          return (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground truncate flex-1 mr-2">{short}</span>
                <span className="text-xs font-semibold text-muted-foreground-1 shrink-0">
                  {cat.count.toLocaleString('ca-ES')}
                </span>
              </div>
              <div className="h-1.5 bg-muted-hover rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: CATEGORY_BLUES[i] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}
