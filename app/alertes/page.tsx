'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, MapPin, Radio, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { KpiCard } from '@/components/inici/KpiCard';
import { supabase } from '@/lib/supabase';
import { parseSentiment } from '@/lib/sentiment';
import { formatDate, truncate } from '@/lib/utils';
import type { SacMessage } from '@/types';

const AlertesMapDynamic = dynamic(
  () => import('@/components/alertes/AlertesMap').then(m => ({ default: m.AlertesMap })),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full rounded-xl" />,
  }
);

type SeverityFilter = 'all' | 'critical' | 'very-critical';

const TABS: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'Tots' },
  { value: 'very-critical', label: 'Molt crític (< 2.5)' },
  { value: 'critical', label: 'Crític (2.5–3.5)' },
];

function severityVariant(score: number | null): 'danger' | 'warning' {
  if (score !== null && score < 2.5) return 'danger';
  return 'warning';
}

function AlertRow({ alert }: { alert: SacMessage }) {
  const [open, setOpen] = useState(false);
  const score = parseSentiment(alert.sentiment);

  return (
    <div className="border border-card-line rounded-xl overflow-hidden">
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted-hover transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        {/* Score badge */}
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

        <div className="shrink-0 text-muted-foreground-2">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {open && alert.message && (
        <div className="px-4 pb-4 pt-0 border-t border-card-line bg-background-1">
          <p className="text-sm text-foreground leading-relaxed">{alert.message}</p>
          {alert.situation && (
            <p className="text-xs text-muted-foreground mt-2 italic">{alert.situation}</p>
          )}
          <div className="flex gap-3 mt-3 text-xs text-muted-foreground-2">
            {alert.ciutada && <span>Ciutadà: {alert.ciutada}</span>}
            {alert.clas2 && <span>· {alert.clas2}</span>}
            {alert.clas3 && <span>· {alert.clas3}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlertesPage() {
  const [alerts, setAlerts] = useState<SacMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SeverityFilter>('all');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('sac_messages')
        .select('*')
        .order('sentiment', { ascending: true })
        .limit(200);

      const criticals = (data ?? []).filter((m: SacMessage) => {
        const s = parseSentiment(m.sentiment);
        return s !== null && s < 3.5;
      });
      setAlerts(criticals);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const filtered = alerts.filter(a => {
    const s = parseSentiment(a.sentiment);
    if (filter === 'very-critical') return s !== null && s < 2.5;
    if (filter === 'critical') return s !== null && s >= 2.5 && s < 3.5;
    return true;
  });

  // KPI stats
  const totalCritical = alerts.length;
  const barriCounts = alerts.reduce<Record<string, number>>((acc, a) => {
    const b = a.barri ?? 'Desconegut';
    acc[b] = (acc[b] ?? 0) + 1;
    return acc;
  }, {});
  const worstBarri = Object.entries(barriCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const canalCounts = alerts.reduce<Record<string, number>>((acc, a) => {
    const c = a.canal ?? 'Desconegut';
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
  const topCanal = Object.entries(canalCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const avgScore = alerts.length > 0
    ? alerts.reduce((s, a) => s + (parseSentiment(a.sentiment) ?? 0), 0) / alerts.length
    : null;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total alertes crítiques"
          value={loading ? '—' : totalCritical.toString()}
          icon={<AlertTriangle className="w-4 h-4" />}
          variant={totalCritical > 0 ? 'danger' : 'success'}
          loading={loading}
        />
        <KpiCard
          label="Sentiment mitjà crític"
          value={avgScore !== null ? avgScore.toFixed(2) : '—'}
          sub="Escala 0–10"
          icon={<AlertTriangle className="w-4 h-4" />}
          variant="warning"
          loading={loading}
        />
        <KpiCard
          label="Barri més afectat"
          value={loading ? '—' : worstBarri}
          icon={<MapPin className="w-4 h-4" />}
          loading={loading}
        />
        <KpiCard
          label="Canal principal"
          value={loading ? '—' : topCanal}
          icon={<Radio className="w-4 h-4" />}
          loading={loading}
        />
      </div>

      {/* Severity filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`py-1.5 px-3 inline-flex items-center text-sm font-medium rounded-lg transition-colors focus:outline-none ${
              filter === tab.value
                ? 'bg-primary text-primary-foreground border border-primary-line'
                : 'bg-layer border border-layer-line text-layer-foreground shadow-2xs hover:bg-layer-hover'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} alertes</span>
      </div>

      {/* Two-column: list + map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts list */}
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
            filtered.slice(0, 20).map(alert => (
              <AlertRow key={alert.id} alert={alert} />
            ))
          )}
        </div>

        {/* Mini map */}
        <Card className="p-0 overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-card-line">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-red-500" />
              Localització de les alertes
            </CardTitle>
          </CardHeader>
          <div className="h-96 lg:h-full min-h-80">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <AlertesMapDynamic alerts={filtered} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
