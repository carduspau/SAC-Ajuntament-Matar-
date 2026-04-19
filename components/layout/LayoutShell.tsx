'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ChatPanel } from '@/components/chatbot/ChatPanel';
import { useChat } from '@/context/ChatContext';
import { cn } from '@/lib/utils';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { chatOpen, closeChat } = useChat();

  // Lock body scroll when chat is open on mobile
  useEffect(() => {
    document.body.style.overflow = chatOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [chatOpen]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile nav backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        forceCollapsed={chatOpen}
      />

      {/* Main content area */}
      <div className={cn(
        'flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300'
      )}>
        <Header onMenuClick={() => setMobileNavOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background-1">
          {children}
        </main>
      </div>

      {/* Chat side drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 z-40 h-full w-full sm:w-[480px] lg:w-[520px]',
          'transition-transform duration-300 ease-in-out',
          chatOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Assistent SAC"
      >
        <ChatPanel onClose={closeChat} />
      </div>
    </div>
  );
}
