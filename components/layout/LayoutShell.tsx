'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ChatPanel } from '@/components/chatbot/ChatPanel';
import { useChat } from '@/context/ChatContext';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { chatOpen, closeChat } = useChat();

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

      {/* Right side: header + content row */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setMobileNavOpen(o => !o)} />

        {/* Content row: main + optional chat panel (inline, no overlay) */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background-1 min-w-0">
            {children}
          </main>

          {/*
            Chat panel: conditional render (not CSS width animation).
            ResponsiveContainer needs a stable container width from the start;
            animating from w-0 causes it to measure 0 and the chart never renders.
          */}
          {chatOpen && (
            <div className="w-[min(38vw,460px)] min-w-[320px] shrink-0 border-l border-card-line overflow-hidden">
              <ChatPanel onClose={closeChat} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
