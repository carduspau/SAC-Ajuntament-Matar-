'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { sentimentColor } from '@/lib/sentiment';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChartWrapper } from '@/components/ui/ChartWrapper';
import type { BarriStat } from '@/types';

interface Props {
  data: BarriStat[];
  loading?: boolean;
  height?: number;
  colorBy?: 'count' | 'sentiment';
  maxItems?: number;
  title?: string;
  label?: string;
}

export function NeighborhoodBarChart({ data, loading, height = 300, colorBy = 'count', maxItems = 15, title, label }: Props) {
  if (loading) return <Skeleton className="w-full" style={{ height }} />;

  const sliced = data.slice(0, maxItems).map(d => ({
    barri: d.barri.length > 16 ? d.barri.slice(0, 16) + '…' : d.barri,
    fullBarri: d.barri,
    Missatges: d.count,
    sentiment: d.avg_sentiment,
  }));

  const csvData = data.slice(0, maxItems).map(d => ({
    Barri: d.barri,
    Missatges: d.count,
    ...(d.avg_sentiment !== null ? { 'Sentiment_mitja': d.avg_sentiment.toFixed(2) } : {}),
  }));

  const chart = (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sliced} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="barri"
          tick={{ fontSize: 10, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullBarri ?? ''}
          formatter={(v: number, name: string) => [v, name]}
        />
        <Bar dataKey="Missatges" radius={[4, 4, 0, 0]}>
          {sliced.map((entry, i) => (
            <Cell
              key={i}
              fill={colorBy === 'sentiment' ? sentimentColor(entry.sentiment) : '#6366f1'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  if (title) {
    return (
      <ChartWrapper title={title} label={label} csvData={csvData}>
        {chart}
      </ChartWrapper>
    );
  }
  return chart;
}
