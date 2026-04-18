'use client';

import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChartWrapper } from '@/components/ui/ChartWrapper';
import { getCategoryColor } from '@/lib/categoryColors';
import type { CategoryStat } from '@/types';

interface Props {
  data: CategoryStat[];
  loading?: boolean;
  height?: number;
  maxItems?: number;
  title?: string;
}

export function CategoryBarChart({ data, loading, height = 300, maxItems = 10, title }: Props) {
  if (loading) return <Skeleton className="w-full" style={{ height }} />;

  const sliced = data.slice(0, maxItems).map(d => ({
    category: d.category.length > 28 ? d.category.slice(0, 28) + '…' : d.category,
    fullCategory: d.category,
    Missatges: d.count,
  }));

  const csvData = data.slice(0, maxItems).map(d => ({
    Categoria: d.category,
    Missatges: d.count,
  }));

  const chart = (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sliced} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis
          dataKey="category"
          type="category"
          width={200}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
        />
        <Bar dataKey="Missatges" radius={[0, 4, 4, 0]}>
          {sliced.map((d, i) => (
            <Cell key={i} fill={getCategoryColor(d.fullCategory)} />
          ))}
        </Bar>
      </BarChart>
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
