'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send, Settings, Bot, Trash2, X, Maximize2,
  BarChart2, TrendingUp, MapPin, Radio, Tag, AlertTriangle,
} from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ApiKeyDialog } from './ApiKeyDialog';
import { useDateRange } from '@/context/DateRangeContext';
import { useStats } from '@/hooks/useStats';
import { Spinner } from '@/components/ui/Spinner';
import type { ChatMessage as ChatMsgType, ChatAction } from '@/types';

const WELCOME: ChatMsgType = {
  role: 'assistant',
  content: 'Hola! Sóc l\'assistent analític del SAC.\n\nPuc consultar **dades reals** de la base de dades: evolució temporal, distribució per barris, categories, canals, sentiment... Pots especificar dates, barri i categoria concrets.\n\nTambé puc **portar-te a pàgines** o **aplicar filtres** al dashboard.',
};

const SUGGESTED_QUERIES = [
  { label: 'Barris', query: 'Quins barris tenen més missatges?', icon: MapPin },
  { label: 'Canals', query: 'Distribució per canals de comunicació', icon: Radio },
  { label: 'Categories', query: 'Principals categories de consultes', icon: Tag },
  { label: 'Tendència', query: 'Evolució de missatges del mes actual', icon: TrendingUp },
  { label: 'Alertes', query: 'Quants missatges crítics hi ha?', icon: AlertTriangle },
  { label: 'Resum', query: 'Fes-me un resum general de les dades', icon: BarChart2 },
];

interface ChatPanelProps {
  onClose?: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const router = useRouter();
  const { from, to, setCustomRange } = useDateRange();
  const { data: statsData } = useStats();
  const [messages, setMessages] = useState<ChatMsgType[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildStats = useCallback(() => ({
    total: statsData?.total ?? 0,
    avgSentiment: statsData?.avg_sentiment ?? null,
    criticalCount: statsData?.critical_count ?? 0,
    topBarri: statsData?.by_barri[0]?.barri ?? null,
    topCanal: statsData?.by_canal[0]?.canal ?? null,
    topCategory: statsData?.by_clas1[0]?.category ?? null,
    byBarri: Object.fromEntries((statsData?.by_barri ?? []).slice(0, 8).map(b => [b.barri, b.count])),
    byCanal: Object.fromEntries((statsData?.by_canal ?? []).map(c => [c.canal, c.count])),
    byClas1: Object.fromEntries((statsData?.by_clas1 ?? []).slice(0, 8).map(c => [c.category, c.count])),
  }), [statsData]);

  async function sendMessage(text?: string) {
    const msgText = (text ?? input).trim();
    if (!msgText || loading) return;

    const userMsg: ChatMsgType = { role: 'user', content: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const apiKey = typeof window !== 'undefined' ? (localStorage.getItem('sac_openai_key') ?? '') : '';
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(1),
          filters: { from: from.toISOString(), to: to.toISOString() },
          apiKey: apiKey || undefined,
          stats: buildStats(),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content ?? 'Error',
        chart: data.chart ?? undefined,
        action: data.action ?? undefined,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de connexió. Torna-ho a provar.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleAction(action: ChatAction) {
    if (action.type === 'navigate' && action.href) {
      router.push(action.href);
      // Assistant stays open on navigate
    } else if (action.type === 'setFilter' && action.dateFrom && action.dateTo) {
      setCustomRange(new Date(action.dateFrom), new Date(action.dateTo));
      if (action.href) router.push(action.href);
    }
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-card-line shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-line bg-primary shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary-foreground" />
          <span className="text-sm font-semibold text-primary-foreground">Assistent SAC</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/xat" title="Obrir en pantalla completa"
            className="p-1.5 rounded-lg hover:bg-primary-hover transition-colors focus:outline-none">
            <Maximize2 className="w-4 h-4 text-primary-foreground" />
          </Link>
          <button onClick={() => setMessages([WELCOME])} title="Netejar conversa"
            className="p-1.5 rounded-lg hover:bg-primary-hover transition-colors focus:outline-none">
            <Trash2 className="w-4 h-4 text-primary-foreground" />
          </button>
          <button onClick={() => setShowSettings(true)} title="Configuració OpenAI"
            className="p-1.5 rounded-lg hover:bg-primary-hover transition-colors focus:outline-none">
            <Settings className="w-4 h-4 text-primary-foreground" />
          </button>
          {onClose && (
            <button onClick={onClose} title="Tancar"
              className="p-1.5 rounded-lg hover:bg-primary-hover transition-colors focus:outline-none ml-1">
              <X className="w-4 h-4 text-primary-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Quick action chips */}
      <div className="px-3 py-2 border-b border-card-line bg-muted/30 shrink-0">
        <div className="flex gap-1.5 flex-wrap">
          {SUGGESTED_QUERIES.map(({ label, query, icon: Icon }) => (
            <button key={label} onClick={() => sendMessage(query)} disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-card border border-card-line hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb [&::-webkit-scrollbar-thumb]:rounded-full">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} onAction={handleAction} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Spinner className="w-4 h-4" />
            <span>Consultant la base de dades...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-card-line p-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ex: Gràfic de neteja a Cerdanyola l'abril 2026..."
            className="flex-1 rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground-2 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
            disabled={loading}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground-2 mt-1.5 text-center">
          Dades en temps real · Pots especificar dates, barri i categoria
        </p>
      </div>

      <ApiKeyDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
