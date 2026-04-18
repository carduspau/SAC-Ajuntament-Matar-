'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { sentimentColor } from '@/lib/sentiment';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChartWrapper } from '@/components/ui/ChartWrapper';

interface Props {
  data: { range: string; count: number }[];
  loading?: boolean;
  height?: number;
  title?: string;
}

export function SentimentHistogram({ data, loading, height = 240, title }: Props) {
  if (loading) return <Skeleton className="w-full" style={{ height }} />;

  const csvData = data.map(d => ({
    'Rang_sentiment': d.range,
    Missatges: d.count,
  }));

  const chart = (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
        />
        <Bar dataKey="count" name="Missatges" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => {
            const midVal = parseFloat(entry.range.split('–')[0]) + 0.5;
            return <Cell key={i} fill={sentimentColor(midVal)} />;
          })}
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
