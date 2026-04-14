import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMsgType, ChatChartData } from '@/types';

const CHART_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#64748b', '#1d4ed8', '#0ea5e9'];

function InlineChatChart({ chart }: { chart: ChatChartData }) {
  const data = chart.data.slice(0, 8);

  return (
    <div className="mt-3 bg-white rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-semibold text-slate-600 mb-2">{chart.title}</p>
      <ResponsiveContainer width="100%" height={160}>
        {chart.type === 'pie' ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={55}
              innerRadius={28}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
              formatter={(v: number) => [v.toLocaleString('ca-ES'), '']}
            />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        ) : chart.type === 'line' ? (
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={12}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function ChatMessage({ message }: { message: ChatMsgType }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[90%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        )}
      >
        {message.content}
        {!isUser && message.chart && <InlineChatChart chart={message.chart} />}
      </div>
    </div>
  );
}
