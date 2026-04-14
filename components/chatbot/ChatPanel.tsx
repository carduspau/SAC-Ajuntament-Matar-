'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, Bot } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ApiKeyDialog } from './ApiKeyDialog';
import { useDateRange } from '@/context/DateRangeContext';
import { useStats } from '@/hooks/useStats';
import { Spinner } from '@/components/ui/Spinner';
import type { ChatMessage as ChatMsgType } from '@/types';

const WELCOME: ChatMsgType = {
  role: 'assistant',
  content: 'Hola! Sóc l\'assistent analític del SAC. Pots preguntar-me sobre les dades del període seleccionat: sentiments, barris, tendències, alertes...\n\n⚙️ Si vols respostes reals d\'IA, configura la teva clau d\'OpenAI al botó de configuració.',
};

export function ChatPanel() {
  const { from, to } = useDateRange();
  const { data: statsData } = useStats();
  const [messages, setMessages] = useState<ChatMsgType[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMsgType = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const apiKey = typeof window !== 'undefined' ? (localStorage.getItem('sac_openai_key') ?? '') : '';

      const stats = {
        total: statsData?.total ?? 0,
        avgSentiment: statsData?.avg_sentiment ?? null,
        criticalCount: statsData?.critical_count ?? 0,
        topBarri: statsData?.by_barri[0]?.barri ?? null,
        topCanal: statsData?.by_canal[0]?.canal ?? null,
        topCategory: statsData?.by_clas1[0]?.category ?? null,
        byBarri: Object.fromEntries((statsData?.by_barri ?? []).slice(0, 8).map(b => [b.barri, b.count])),
        byCanal: Object.fromEntries((statsData?.by_canal ?? []).map(c => [c.canal, c.count])),
        byClas1: Object.fromEntries((statsData?.by_clas1 ?? []).slice(0, 8).map(c => [c.category, c.count])),
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(1),
          filters: { from: from.toISOString(), to: to.toISOString() },
          apiKey: apiKey || undefined,
          stats,
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
    <div className="flex flex-col h-full bg-card rounded-2xl border border-card-line shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-line bg-primary">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary-foreground" />
          <span className="text-sm font-semibold text-primary-foreground">Assistent SAC</span>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded-lg hover:bg-primary-hover transition-colors focus:outline-none"
          title="Configuració OpenAI"
        >
          <Settings className="w-4 h-4 text-primary-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb [&::-webkit-scrollbar-thumb]:rounded-full">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Spinner className="w-4 h-4" />
            <span>Pensant...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-card-line p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Fes una pregunta..."
            className="flex-1 rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground-2 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ApiKeyDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
