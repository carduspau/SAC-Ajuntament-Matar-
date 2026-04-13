'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';
import type { TimelineBucket, TimelineGranularity } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  data: TimelineBucket[];
  loading?: boolean;
  granularity?: TimelineGranularity;
  height?: number;
  showSentiment?: boolean;
}

function formatBucket(bucket: string, granularity: TimelineGranularity = 'day'): string {
  try {
    const d = bucket.includes('T') ? parseISO(bucket) : new Date(bucket + 'T00:00:00');
    switch (granularity) {
      case 'hour': return format(d, 'HH:mm', { locale: ca });
      case 'day': return format(d, 'dd MMM', { locale: ca });
      case 'week': return `S${format(d, 'w', { locale: ca })}`;
      case 'month': return format(d, 'MMM yyyy', { locale: ca });
    }
  } catch { return bucket; }
}

const CustomTooltip = ({ active, payload, label, granularity }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{formatBucket(label, granularity)}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-gray-600" style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export function TimelineChart({ data, loading, granularity = 'day', height = 280, showSentiment = true }: Props) {
  if (loading) return <Skeleton className={`w-full`} style={{ height }} />;

  const chartData = data.map(d => ({
    bucket: d.bucket,
    Missatges: d.count,
    'Sentiment mitjà': d.avg_sentiment !== null ? parseFloat(d.avg_sentiment.toFixed(2)) : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradMsg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="bucket"
          tickFormatter={v => formatBucket(v, granularity)}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        {showSentiment && (
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 10]}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
        )}
        <Tooltip content={<CustomTooltip granularity={granularity} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="Missatges"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#gradMsg)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        {showSentiment && (
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="Sentiment mitjà"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gradSent)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
