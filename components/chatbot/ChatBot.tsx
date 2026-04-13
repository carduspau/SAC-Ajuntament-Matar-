'use client';

import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { cn } from '@/lib/utils';

export function ChatBot() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg',
          'bg-indigo-600 hover:bg-indigo-700 text-white',
          'flex items-center justify-center transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2',
          open && 'scale-90'
        )}
        aria-label="Obrir xatbot"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 w-96 h-[32rem]',
          'transition-all duration-300 ease-in-out',
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <ChatPanel />
      </div>
    </>
  );
}
