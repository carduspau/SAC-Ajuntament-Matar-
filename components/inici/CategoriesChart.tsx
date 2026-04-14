'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from 'lucide-react';
import type { CategoryStat } from '@/types';

interface Props {
  data: CategoryStat[];
  loading?: boolean;
}

const BLUE_SHADES = [
  '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa',
  '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff',
];

export function CategoriesChart({ data, loading }: Props) {
  const top8 = data.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          Categories principals
        </CardTitle>
      </CardHeader>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : top8.length === 0 ? (
        <p className="text-sm text-muted-foreground-2 text-center py-8">Sense dades</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={top8}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          >
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="category"
              width={130}
              tick={{ fontSize: 11, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }}
              formatter={(value: number) => [value.toLocaleString('ca-ES'), 'Missatges']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
              {top8.map((_, i) => (
                <Cell key={i} fill={BLUE_SHADES[i % BLUE_SHADES.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
