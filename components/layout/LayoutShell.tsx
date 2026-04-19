'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ChatPanel } from '@/components/chatbot/ChatPanel';
import { useChat } from '@/context/ChatContext';
import { cn } from '@/lib/utils';

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

        {/* Content row: main (3/4) + chat panel (1/4) — inline, no overlay */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background-1 min-w-0">
            {children}
          </main>

          {/* Chat panel: shrinks/expands inline, pushes main content */}
          <div
            className={cn(
              'shrink-0 overflow-hidden border-l border-card-line',
              'transition-all duration-300 ease-in-out',
              chatOpen
                ? 'w-[min(38vw,460px)] min-w-[320px]'
                : 'w-0 border-l-0'
            )}
          >
            {/* Inner div keeps a stable width so content doesn't reflow */}
            <div className="w-[460px] h-full">
              <ChatPanel onClose={closeChat} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
