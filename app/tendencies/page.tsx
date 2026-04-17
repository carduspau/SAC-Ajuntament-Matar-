'use client';

import React from 'react';
import { TrendingUp, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useTrends } from '@/hooks/useTrends';
import { Skeleton } from '@/components/ui/Skeleton';
import type { TrendInsight } from '@/hooks/useTrends';

const SEVERITY_CONFIG = {
  high: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-600',
    iconBg: 'bg-red-100',
    label: 'Prioritat alta',
    icon: AlertTriangle,
    dotColor: '#ef4444',
  },
  medium: {
    border: 'border-l-orange-400',
    badge: 'bg-orange-100 text-orange-600',
    iconBg: 'bg-orange-100',
    label: 'Prioritat mitjana',
    icon: AlertCircle,
    dotColor: '#f97316',
  },
  info: {
    border: 'border-l-blue-400',
    badge: 'bg-blue-100 text-blue-600',
    iconBg: 'bg-blue-100',
    label: 'Informació',
    icon: Info,
    dotColor: '#3b82f6',
  },
};

function MiniBar({ label, value, max, hex }: { label: string; value: number; max: number; hex: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground-2 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-muted-hover rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: hex }} />
      </div>
      <span className="text-xs font-semibold text-foreground w-10 text-right shrink-0">
        {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
      </span>
    </div>
  );
}

function InsightCard({ insight }: { insight: TrendInsight }) {
  const cfg = SEVERITY_CONFIG[insight.severity];
  const Icon = cfg.icon;
  const maxVal = insight.comparison ? Math.max(...insight.comparison.map(c => c.value)) : 1;

  return (
    <div className={`bg-card border border-card-line border-l-4 ${cfg.border} rounded-xl p-5 shadow-xs flex flex-col gap-3`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
          <Icon className="w-4 h-4" style={{ color: cfg.dotColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            {insight.metric && (
              <span className="text-xs text-muted-foreground-2 font-mono bg-muted-hover px-2 py-0.5 rounded-full">
                {insight.metric}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug">{insight.title}</h3>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground-1 leading-relaxed">{insight.description}</p>

      {/* Mini comparison chart */}
      {insight.comparison && insight.comparison.length > 0 && (
        <div className="pt-2 border-t border-card-line space-y-1.5">
          {insight.comparisonLabel && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground-2 mb-2">
              {insight.comparisonLabel}
            </p>
          )}
          {insight.comparison.map(item => (
            <MiniBar key={item.label} label={item.label} value={item.value} max={maxVal} hex={item.hex} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
        <TrendingUp className="w-7 h-7 text-emerald-600" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">Cap tendència destacada</h3>
      <p className="text-sm text-muted-foreground-2 max-w-sm">
        No s'han detectat patrons estadísticament significatius en el període seleccionat. Prova un rang de dates més ampli.
      </p>
    </div>
  );
}

export default function TendenciesPage() {
  const { insights, loading } = useTrends();

  const highCount = insights.filter(i => i.severity === 'high').length;
  const mediumCount = insights.filter(i => i.severity === 'medium').length;
  const infoCount = insights.filter(i => i.severity === 'info').length;

  return (
    <div className="space-y-6">
      {/* Header summary */}
      {!loading && insights.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {insights.length} tendències detectades automàticament
            </span>
          </div>
          <div className="flex items-center gap-2">
            {highCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                {highCount} prioritat alta
              </span>
            )}
            {mediumCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-600">
                {mediumCount} prioritat mitjana
              </span>
            )}
            {infoCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-600">
                {infoCount} informació
              </span>
            )}
          </div>
        </div>
      )}

      {/* Explanation banner */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl px-5 py-4 flex items-start gap-3">
        <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground-1 leading-relaxed">
          <span className="font-semibold text-foreground">Anàlisi estadística automàtica.</span>
          {' '}El sistema creua totes les dimensions disponibles (idioma, canal, barri, departament, hora, experiència) i detecta patrons que superen llindars estadísticament significatius. Les tendències s'actualitzen en temps real segons el període seleccionat.
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {insights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
