'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChartWrapper } from '@/components/ui/ChartWrapper';
import type { CanalStat } from '@/types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

interface Props {
  data: CanalStat[];
  loading?: boolean;
  height?: number;
  title?: string;
}

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function ChannelPieChart({ data, loading, height = 280, title }: Props) {
  if (loading) return <Skeleton className="w-full" style={{ height }} />;

  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map(d => ({ name: d.canal, value: d.count }));

  const csvData = data.map(d => ({
    Canal: d.canal,
    Missatges: d.count,
    'Percentatge (%)': total > 0 ? ((d.count / total) * 100).toFixed(1) : '0.0',
  }));

  const chart = (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          outerRadius={90}
          dataKey="value"
          labelLine={false}
          label={renderLabel}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
          formatter={(value: number, name: string) => [value.toLocaleString('ca-ES'), name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  if (title) {
    return (
      <ChartWrapper title={title} csvData={csvData}>
        {chart}
      </ChartWrapper>
    );
  }
  return chart;
}
