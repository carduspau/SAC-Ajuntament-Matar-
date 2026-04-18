'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { cn } from '@/lib/utils';

export function ChatBot() {
  const [open, setOpen] = useState(false);

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg',
          'bg-primary hover:bg-primary-hover text-primary-foreground',
          'flex items-center justify-center transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2',
          open && 'scale-90'
        )}
        aria-label="Obrir assistent SAC"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Backdrop (mobile) */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden="true"
      />

      {/* Side drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 z-40 h-full w-full sm:w-[480px] lg:w-[520px]',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Assistent SAC"
      >
        <ChatPanel onClose={() => setOpen(false)} />
      </div>
    </>
  );
}
