'use client';

import React, { useRef } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChartDownloadButtons, downloadPng, downloadCsv } from '@/components/ui/ChartDownload';
import { Radio } from 'lucide-react';
import type { CanalStat } from '@/types';

interface Props {
  data: CanalStat[];
  loading?: boolean;
}

// Distinct, vibrant palette — clearly different from the all-blue bar chart
const PALETTE = [
  '#2563eb', // blue
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#db2777', // pink
  '#65a30d', // lime
];

// Custom center label rendered via SVG
function CenterLabel({ total, cx, cy }: { total: number; cx: number; cy: number }) {
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: 22, fontWeight: 800, fill: '#0f172a' }}>
        {total.toLocaleString('ca-ES')}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        TOTAL
      </text>
    </g>
  );
}

export function CanalChart({ data, loading }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map((d, i) => ({
    name: d.canal,
    value: d.count,
    color: PALETTE[i % PALETTE.length],
    pct: total > 0 ? ((d.count / total) * 100).toFixed(1) : '0.0',
  }));

  const csvData = chartData.map(d => ({
    Canal: d.name,
    Missatges: d.value,
    'Percentatge (%)': d.pct,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string; pct: string } }[] }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
      <div className="bg-card border border-card-line rounded-xl px-3 py-2 shadow-xs text-xs">
        <p className="font-semibold text-foreground mb-0.5">{p.name}</p>
        <p className="text-muted-foreground-1">{p.value.toLocaleString('ca-ES')} missatges · <span className="font-bold" style={{ color: p.payload.color }}>{p.payload.pct}%</span></p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" />
          Distribució per canal
        </CardTitle>
        <ChartDownloadButtons
          onPng={() => ref.current && downloadPng(ref.current, 'distribucio-canal')}
          onCsv={() => downloadCsv('distribucio-canal', csvData)}
        />
      </CardHeader>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground-2 text-center py-10">Sense dades</p>
      ) : (
        <div ref={ref} className="flex flex-col sm:flex-row items-center gap-4">
          {/* Donut */}
          <div className="shrink-0" style={{ width: 200, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={92}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={false}
                  label={false}
                  labelLine={false}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                {/* Center label via customized */}
                <Pie
                  data={[{ value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={0}
                  dataKey="value"
                  label={({ cx, cy }) => <CenterLabel total={total} cx={cx} cy={cy} />}
                  labelLine={false}
                  isAnimationActive={false}
                >
                  <Cell fill="transparent" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom legend */}
          <div className="flex-1 min-w-0 w-full space-y-2.5 py-2">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-foreground truncate flex-1 min-w-0">
                  {entry.name}
                </span>
                <span className="text-xs font-bold tabular-nums text-muted-foreground-1 shrink-0">
                  {entry.value.toLocaleString('ca-ES')}
                </span>
                <span
                  className="text-[10px] font-semibold tabular-nums shrink-0 w-8 text-right"
                  style={{ color: entry.color }}
                >
                  {entry.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
