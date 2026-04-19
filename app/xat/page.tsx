'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Trash2, Settings, Bot, Sparkles,
  BarChart2, TrendingUp, MapPin, Radio, Tag, AlertTriangle,
  Layers, GitBranch,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Spinner } from '@/components/ui/Spinner';
import { ApiKeyDialog } from '@/components/chatbot/ApiKeyDialog';
import { useDateRange } from '@/context/DateRangeContext';
import { downloadCsv, downloadPng } from '@/components/ui/ChartDownload';
import { cn } from '@/lib/utils';
import type { ChatMessage, ChatChartData } from '@/types';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'];

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: 'Benvingut al **Xat d\'IA avançat** del SAC.\n\nPuc generar gràfics creatius i detallats directament des de les dades reals:\n\n• **Dispersió** sentiment vs urgència per barri\n• **Evolució temporal** amb sentiments\n• **Correlacions** entre variables\n• **Distribucions** per departament, intenció, canal...\n\nPots especificar el **rang de dates** al selector de dalt. Quin anàlisi vols fer?',
};

const SUGGESTED: { label: string; query: string; icon: React.ElementType; color: string }[] = [
  { label: 'Dispersió sentiment/urgència', query: 'Mostra un gràfic de dispersió de la relació entre sentiment i urgència per barri', icon: GitBranch, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { label: 'Evolució temporal', query: 'Evolució diària de missatges i sentiment', icon: TrendingUp, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { label: 'Barris afectats', query: 'Quins barris concentren més missatges?', icon: MapPin, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { label: 'Per departament', query: 'Distribució de missatges per departament', icon: Layers, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { label: 'Canals', query: 'Distribució per canals de comunicació', icon: Radio, color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
  { label: 'Categories', query: 'Principals categories de consultes', icon: Tag, color: 'bg-pink-50 text-pink-600 border-pink-200' },
  { label: 'Sentiment', query: 'Distribució detallada del sentiment dels missatges', icon: BarChart2, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  { label: 'Alertes', query: 'Quants missatges crítics hi ha i on es concentren?', icon: AlertTriangle, color: 'bg-red-50 text-red-600 border-red-200' },
];

// ─── Scatter tooltip ─────────────────────────────────────────────────────────
function ScatterTooltipContent({ active, payload }: { active?: boolean; payload?: { payload: { name: string; x: number; y: number; value: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-card-line rounded-xl shadow-xs px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{d.name}</p>
      <p className="text-muted-foreground-1">Sentiment: <span className="font-medium text-foreground">{d.x}/10</span></p>
      <p className="text-muted-foreground-1">Urgència: <span className="font-medium text-foreground">{d.y}%</span></p>
      <p className="text-muted-foreground-1">Missatges: <span className="font-medium text-foreground">{d.value}</span></p>
    </div>
  );
}

// ─── Xat chart renderer (larger than sidebar) ─────────────────────────────────
function XatChart({ chart }: { chart: ChatChartData }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const data = chart.data.slice(0, 20);
  const HEIGHT = 340;

  const handlePng = useCallback(async () => {
    if (chartRef.current) await downloadPng(chartRef.current, chart.title);
  }, [chart.title]);

  const handleCsv = useCallback(() => {
    downloadCsv(chart.title, data.map(d => ({
      Nom: d.name,
      Valor: d.value,
      ...(d.x !== undefined ? { X: d.x, Y: d.y } : {}),
    })));
  }, [chart.title, data]);

  const renderChart = () => {
    if (chart.type === 'scatter') {
      const scatterPoints = data.map(d => ({ name: d.name, x: d.x ?? 0, y: d.y ?? 0, value: d.value }));
      return (
        <ScatterChart margin={{ top: 16, right: 24, bottom: 48, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 10]}
            name={chart.xLabel ?? 'X'}
            label={{ value: chart.xLabel ?? 'Sentiment (0-10)', position: 'insideBottom', offset: -36, fontSize: 11, fill: '#9ca3af' }}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={chart.yLabel ?? 'Y'}
            label={{ value: chart.yLabel ?? 'Urgència (%)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: '#9ca3af' }}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <ZAxis type="number" dataKey="value" range={[40, 400]} />
          <Tooltip content={<ScatterTooltipContent />} />
          <Scatter
            data={scatterPoints}
            fill="#6366f1"
            fillOpacity={0.75}
          >
            {scatterPoints.map((p, i) => (
              <Cell
                key={i}
                fill={p.x < 4 ? '#ef4444' : p.x < 6 ? '#f97316' : '#10b981'}
                fillOpacity={0.8}
              />
            ))}
          </Scatter>
        </ScatterChart>
      );
    }

    if (chart.type === 'pie') {
      return (
        <PieChart>
          <Pie data={data} cx="50%" cy="45%" outerRadius={120} innerRadius={55} dataKey="value" paddingAngle={2} labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} formatter={(v: number) => [v.toLocaleString('ca-ES'), '']} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      );
    }

    if (chart.type === 'area') {
      return (
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="xatGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} />
          <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#xatGrad)" dot={false} name="Missatges" />
        </AreaChart>
      );
    }

    if (chart.type === 'line') {
      return (
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} />
          <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
        </LineChart>
      );
    }

    // bar (default)
    const isVertical = data.length <= 6;
    if (isVertical) {
      return (
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Missatges">
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      );
    }
    return (
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} name="Missatges">
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    );
  };

  return (
    <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/70">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <p className="text-xs font-semibold text-gray-700">{chart.title}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handlePng} title="Descarregar PNG"
            className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            PNG
          </button>
          <button onClick={handleCsv} title="Descarregar CSV"
            className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            CSV
          </button>
        </div>
      </div>
      <div ref={chartRef} className="p-4 bg-white">
        <ResponsiveContainer width="100%" height={HEIGHT}>
          {renderChart()}
        </ResponsiveContainer>
        {data.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">Sense dades per al filtre seleccionat</p>
        )}
      </div>
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  return text.split('\n').flatMap((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, pi) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${li}-${pi}`}>{part.slice(2, -2)}</strong>;
      }
      return <span key={`${li}-${pi}`}>{part}</span>;
    });
    return li === 0 ? parts : [<br key={`br-${li}`} />, ...parts];
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function XatPage() {
  const { from, to } = useDateRange();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text?: string) {
    const msgText = (text ?? input).trim();
    if (!msgText || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const apiKey = typeof window !== 'undefined' ? (localStorage.getItem('sac_openai_key') ?? '') : '';
      const res = await fetch('/api/xat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(1),
          filters: { from: from.toISOString(), to: to.toISOString() },
          apiKey: apiKey || undefined,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content ?? 'Error',
        chart: data.chart ?? undefined,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de connexió. Torna-ho a provar.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Xat d&apos;IA</h1>
            <p className="text-xs text-muted-foreground-2">Gràfics avançats amb dades reals del SAC · Rang de dates del selector de dalt</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-line text-xs text-muted-foreground hover:bg-muted-hover transition-colors">
            <Settings className="w-3.5 h-3.5" />
            OpenAI
          </button>
          <button onClick={() => setMessages([WELCOME])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-line text-xs text-muted-foreground hover:bg-muted-hover transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
            Netejar
          </button>
        </div>
      </div>

      {/* Suggested queries */}
      <div className="flex gap-2 flex-wrap mb-4 shrink-0">
        {SUGGESTED.map(({ label, query, icon: Icon, color }) => (
          <button key={label} onClick={() => sendMessage(query)} disabled={loading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50',
              color, 'hover:opacity-80'
            )}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb [&::-webkit-scrollbar-thumb]:rounded-full">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-1">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-muted-hover text-foreground rounded-bl-sm'
            )}>
              <div className="whitespace-pre-wrap leading-relaxed">
                {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
              </div>
              {msg.role === 'assistant' && msg.chart && <XatChart chart={msg.chart} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Spinner className="w-4 h-4" />
              <span>Generant gràfic des de les dades reals...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-card-line pt-4 mt-4 shrink-0">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ex: Mostra la relació entre sentiment i urgència per barri..."
            className="flex-1 rounded-xl border border-layer-line bg-layer px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground-2 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
            disabled={loading}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground-2 mt-2 text-center">
          Les dates del selector del header s&apos;apliquen als gràfics · Pots demanar qualsevol tipus de gràfic
        </p>
      </div>

      <ApiKeyDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
