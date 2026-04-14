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
        byBarri: Object.fromEntries((statsData?.by_barri ?? []).slice(0, 5).map(b => [b.barri, b.count])),
        byCanal: Object.fromEntries((statsData?.by_canal ?? []).map(c => [c.canal, c.count])),
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(1), // exclude welcome
          filters: { from: from.toISOString(), to: to.toISOString() },
          apiKey: apiKey || undefined,
          stats,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content ?? 'Error' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de connexió. Torna-ho a provar.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-blue-600">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold text-white">Assistent SAC</span>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          title="Configuració OpenAI"
        >
          <Settings className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Spinner className="w-4 h-4" />
            <span>Pensant...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Fes una pregunta..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ApiKeyDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
