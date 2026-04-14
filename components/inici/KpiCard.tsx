'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;        // e.g. 5.2 = +5.2%, -3.1 = -3.1%
  trendLabel?: string;   // text after the badge, e.g. "vs. mes anterior"
  sparkline?: number[];  // raw data array for the mini chart
  variant?: 'default' | 'danger' | 'warning' | 'success';
  invertTrend?: boolean; // true = down is good (e.g. critical alerts)
  loading?: boolean;
}

// Simple SVG sparkline — no Recharts overhead for a tiny decorative line
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 96, H = 44;
  const pts = data.map((v, i) => {
    const x = ((i / (data.length - 1)) * W).toFixed(1);
    const y = (H - ((v - min) / range) * (H - 8) - 4).toFixed(1);
    return `${x},${y}`;
  });
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCard({
  label, value, sub, trend, trendLabel, sparkline,
  variant = 'default', invertTrend = false, loading,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-card-line p-5">
        <Skeleton className="h-3 w-20 mb-4" />
        <div className="flex items-end justify-between gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-10 w-24 rounded" />
        </div>
        <Skeleton className="h-3 w-28 mt-3" />
      </div>
    );
  }

  const isGood = trend !== undefined
    ? (invertTrend ? trend <= 0 : trend >= 0)
    : null;

  const sparkColor =
    variant === 'danger'  ? '#ef4444' :
    variant === 'warning' ? '#f59e0b' :
    variant === 'success' ? '#10b981' :
    '#2563eb';

  const valueStr = String(value);
  const isLongValue = valueStr.length > 10;

  return (
    <div className={cn(
      'bg-card rounded-2xl border p-5',
      variant === 'default'  ? 'border-card-line' :
      variant === 'danger'   ? 'border-red-200'   :
      variant === 'warning'  ? 'border-amber-200' :
      'border-emerald-200'
    )}>
      {/* Label + optional trend badge */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground-2">
          {label}
        </p>
        {trend !== undefined && (
          <span className={cn(
            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
            isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          )}>
            {trend >= 0
              ? <TrendingUp  className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Value + sparkline */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn(
            'font-bold tracking-tight text-foreground leading-none',
            isLongValue ? 'text-lg' : 'text-[2rem]'
          )}>
            {value}
          </p>
          {sub && (
            <p className={cn('text-xs mt-1.5 leading-snug',
              variant === 'danger'  ? 'text-red-500'    :
              variant === 'warning' ? 'text-amber-500'  :
              variant === 'success' ? 'text-emerald-600':
              'text-muted-foreground'
            )}>
              {sub}
            </p>
          )}
        </div>
        {sparkline && sparkline.length >= 2 && (
          <div className="shrink-0 opacity-75">
            <MiniSparkline data={sparkline} color={sparkColor} />
          </div>
        )}
      </div>

      {/* Trend label below (optional) */}
      {trendLabel && (
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-card-line">
          {trendLabel}
        </p>
      )}
    </div>
  );
}
