import type { Metadata } from 'next';
import './globals.css';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { DateRangeProvider } from '@/context/DateRangeContext';
import { ChatProvider } from '@/context/ChatContext';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { PrelineInit } from '@/components/PrelineInit';

export const metadata: Metadata = {
  title: 'SAC Dashboard — Ajuntament de Mataró',
  description: 'Servei d\'Atenció Ciutadana — Panel de control',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ca"
      data-theme="theme-default"
      data-font="sans"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased bg-background-1">
        <PrelineInit />
        <DateRangeProvider>
          <ChatProvider>
            <LayoutShell>{children}</LayoutShell>
          </ChatProvider>
        </DateRangeProvider>
      </body>
    </html>
  );
}
