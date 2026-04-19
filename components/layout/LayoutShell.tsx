'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ChatPanel } from '@/components/chatbot/ChatPanel';
import { useChat } from '@/context/ChatContext';

function MobileChatSheet({ onClose }: { onClose: () => void }) {
  const [deltaY, setDeltaY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [visible, setVisible] = useState(false);
  const startYRef = useRef(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const d = e.touches[0].clientY - startYRef.current;
    if (d > 0) setDeltaY(d);
  }, []);

  const onTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (deltaY > 120) {
      onClose();
    } else {
      setDeltaY(0);
    }
  }, [deltaY, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s' }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 h-[85vh] flex flex-col bg-card rounded-t-2xl shadow-2xl overflow-hidden"
        style={{
          transform: visible ? `translateY(${deltaY}px)` : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-1 shrink-0 select-none touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        {/* Chat content */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel onClose={onClose} />
        </div>
      </div>
    </>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { chatOpen, closeChat } = useChat();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

        {/* Content row: main + optional chat panel */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background-1 min-w-0">
            {children}
          </main>

          {/* Desktop side panel: 1/5 width */}
          {chatOpen && isMobile === false && (
            <div className="w-[min(22vw,400px)] min-w-[280px] shrink-0 border-l border-card-line overflow-hidden">
              <ChatPanel onClose={closeChat} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {chatOpen && isMobile === true && (
        <MobileChatSheet onClose={closeChat} />
      )}
    </div>
  );
}
