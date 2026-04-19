'use client';

import React, { useState } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Legend,
} from 'recharts';
import { Building2, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { ChartWrapper } from '@/components/ui/ChartWrapper';
import { Skeleton } from '@/components/ui/Skeleton';
import { IntentBadge, ActionBadge } from '@/components/ui/Badge';
import { useEnrichedStats } from '@/hooks/useEnrichedStats';
import { DEPT_META, INTENT_META, intentMeta, deptMeta, actionMeta } from '@/lib/intentColors';
import { sentimentColor, sentimentLabel } from '@/lib/sentiment';
import { cn } from '@/lib/utils';
import type { DeptStat } from '@/hooks/useEnrichedStats';

const INTENT_ORDER = ['queixa', 'incidència', 'consulta', 'sol·licitud', 'suggeriment', 'agraïment'];

function KpiMini({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="bg-card border border-card-line rounded-2xl px-5 py-4 flex flex-col gap-1 shadow-xs">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground-2">{label}</p>
      <p className="text-3xl font-extrabold tracking-tight" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground-2">{sub}</p>}
    </div>
  );
}

function DeptCard({ stat, maxCount }: { stat: DeptStat; maxCount: number }) {
  const [expanded, setExpanded] = useState(false);
  const meta = deptMeta(stat.dept);
  const sc = stat.avg_sentiment;
  const sentCol = sentimentColor(sc);

  const intentData = INTENT_ORDER
    .filter(k => stat.by_intent[k])
    .map(k => ({ key: k, count: stat.by_intent[k] ?? 0, label: intentMeta(k).label, hex: intentMeta(k).hex }));

  return (
    <div className="bg-card border border-card-line rounded-2xl overflow-hidden shadow-xs flex flex-col">
      {/* Color bar header */}
      <div className="h-1.5 w-full" style={{ backgroundColor: meta.hex }} />
      <div className="p-5 flex-1 flex flex-col gap-3">
        {/* Name + count */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
            <p className="text-xs text-muted-foreground-2 mt-0.5">{stat.count.toLocaleString('ca-ES')} missatges</p>
          </div>
          <div
            className="text-xs font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: `${meta.hex}18`, color: meta.hex }}
          >
            {((stat.count / maxCount) * 100).toFixed(0)}%
          </div>
        </div>

        {/* Progress bar (count relative) */}
        <div className="h-1.5 bg-muted-hover rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${(stat.count / maxCount) * 100}%`, backgroundColor: meta.hex }} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-background-1 rounded-lg p-2.5">
            <p className="text-muted-foreground-2 mb-0.5">Sentiment</p>
            <p className="font-bold" style={{ color: sentCol }}>{sc?.toFixed(1) ?? '—'} · {sentimentLabel(sc)}</p>
          </div>
          <div className="bg-background-1 rounded-lg p-2.5">
            <p className="text-muted-foreground-2 mb-0.5">Seguiment</p>
            <p className={cn('font-bold', stat.followup_pct > 70 ? 'text-red-600' : stat.followup_pct > 50 ? 'text-amber-600' : 'text-emerald-600')}>
              {stat.followup_pct.toFixed(0)}% ({stat.followup_count})
            </p>
          </div>
        </div>

        {/* Top intent + action */}
        <div className="flex flex-wrap gap-1.5">
          {stat.top_intent && <IntentBadge intent={stat.top_intent} />}
          {stat.top_action && <ActionBadge action={stat.top_action} />}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-primary font-medium hover:underline text-left"
        >
          {expanded ? '▲ Menys detall' : '▼ Veure intencions'}
        </button>

        {expanded && intentData.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-card-line">
            {intentData.map(d => (
              <div key={d.key} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground-2 w-20 shrink-0 truncate">{d.label}</span>
                <div className="flex-1 h-1.5 bg-muted-hover rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(d.count / stat.count) * 100}%`, backgroundColor: d.hex }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground-1 w-6 text-right shrink-0">{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DepartamentsPage() {
  const { data, loading } = useEnrichedStats();

  const depts = data?.by_department ?? [];
  const maxCount = depts[0]?.count ?? 1;

  // Stacked bar: intent by dept (top 7 depts)
  const stackedData = depts.slice(0, 7).map(d => ({
    dept: deptMeta(d.dept).label,
    ...Object.fromEntries(INTENT_ORDER.map(k => [k, d.by_intent[k] ?? 0])),
  }));

  return (
    <div className="space-y-6">

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiMini label="Departaments actius" value={String(depts.length)} sub="amb missatges" accent="#6366f1" />
          <KpiMini label="Seguiment pendent" value={`${data?.followup_count.toLocaleString('ca-ES') ?? 0}`} sub={`${data?.followup_pct.toFixed(0) ?? 0}% del total`} accent="#ef4444" />
          <KpiMini label="Dept. principal" value={deptMeta(depts[0]?.dept).label} sub={`${depts[0]?.count ?? 0} missatges`} accent={deptMeta(depts[0]?.dept).hex} />
          <KpiMini label="Sentiment global" value={data?.by_department.reduce((s, d, _, arr) => s + (d.avg_sentiment ?? 0) / arr.length, 0).toFixed(2) ?? '—'} sub="mitjà de tots els dept." accent="#10b981" />
        </div>
      )}

      {/* Row 1: Dept bar (full width) */}
      <Card>
        {loading ? <Skeleton className="h-72 w-full" /> : (() => {
          const deptBarData = depts.map(d => ({ name: deptMeta(d.dept).label, count: d.count, hex: deptMeta(d.dept).hex }));
          return (
            <ChartWrapper
              title="missatges-departament"
              label="Missatges per departament"
              csvData={deptBarData.map(d => ({ Departament: d.name, Missatges: d.count }))}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deptBarData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={145} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [v.toLocaleString('ca-ES'), 'Missatges']}
                    contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                    {depts.map((d, i) => <Cell key={i} fill={deptMeta(d.dept).hex} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          );
        })()}
      </Card>

      {/* Row 2: Stacked bar intent per dept */}
      <Card>
        {loading ? <Skeleton className="h-64 w-full" /> : (
          <ChartWrapper
            title="intencions-departament"
            label="Distribució d'intencions per departament (top 7)"
            csvData={stackedData.map(d => ({
              Departament: d.dept,
              ...Object.fromEntries(INTENT_ORDER.map(k => [intentMeta(k).label, (d as Record<string, unknown>)[k] ?? 0])),
            }))}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stackedData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value) => intentMeta(value).label} />
                {INTENT_ORDER.map(key => (
                  <Bar key={key} dataKey={key} stackId="a" fill={INTENT_META[key]?.hex ?? '#94a3b8'}
                    name={key} radius={key === 'agraïment' ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        )}
      </Card>

      {/* Dept cards grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground-1 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Targetes per departament
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {depts.map(d => <DeptCard key={d.dept} stat={d} maxCount={maxCount} />)}
          </div>
        )}
      </div>
    </div>
  );
}
