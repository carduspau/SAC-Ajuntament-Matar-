'use client';

import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Props {
  data: { value: number }[];
  color?: string;
  height?: number;
}

export function SparklineChart({ data, color = '#6366f1', height = 40 }: Props) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
