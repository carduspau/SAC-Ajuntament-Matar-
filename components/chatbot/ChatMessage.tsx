'use client';

import React, { useRef, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Download, FileText, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import type { ChatMessage as ChatMsgType, ChatChartData } from '@/types';

const CHART_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#64748b', '#1d4ed8', '#0ea5e9'];

function renderMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function chartToCsvContent(chart: ChatChartData): string {
  const header = `Nom,Valor${chart.unit ? ` (${chart.unit})` : ''}`;
  const rows = chart.data.map(d => `${d.name},${d.value}`);
  return [header, ...rows].join('\n');
}

function InlineChatChart({ chart }: { chart: ChatChartData }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const data = chart.data.slice(0, 10);

  const downloadPng = useCallback(async () => {
    if (!chartRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(chartRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${chart.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  }, [chart.title]);

  const handleCsvDownload = useCallback(() => {
    const csv = chartToCsvContent(chart);
    downloadCsv(csv, `${chart.title.replace(/\s+/g, '-').toLowerCase()}.csv`);
  }, [chart]);

  return (
    <div className="mt-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-600">{chart.title}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCsvDownload}
            title="Exportar CSV"
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={downloadPng}
            title="Exportar PNG"
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div ref={chartRef} className="p-3 bg-white">
        <ResponsiveContainer width="100%" height={200}>
          {chart.type === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={35}
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
              <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          ) : chart.type === 'area' ? (
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
              <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fill="url(#areaGrad)" dot={false} />
            </AreaChart>
          ) : chart.type === 'line' ? (
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          ) : (
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={13}>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ChatMessage({ message }: { message: ChatMsgType }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[92%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted-hover text-foreground rounded-bl-sm'
        )}
      >
        <div className="whitespace-pre-wrap leading-relaxed">
          {isUser ? message.content : renderMarkdown(message.content)}
        </div>
        {!isUser && message.chart && <InlineChatChart chart={message.chart} />}
      </div>
    </div>
  );
}
