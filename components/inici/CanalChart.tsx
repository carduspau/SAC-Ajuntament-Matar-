'use client';

import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Radio } from 'lucide-react';
import type { CanalStat } from '@/types';

interface Props {
  data: CanalStat[];
  loading?: boolean;
}

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#64748b'];

export function CanalChart({ data, loading }: Props) {
  const chartData = data.map((d, i) => ({
    name: d.canal,
    value: d.count,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-600" />
          Distribució per canal
        </CardTitle>
      </CardHeader>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : chartData.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Sense dades</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }}
              formatter={(value: number) => [value.toLocaleString('ca-ES'), 'Missatges']}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
