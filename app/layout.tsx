import type { Metadata } from 'next';
import './globals.css';
import { DateRangeProvider } from '@/context/DateRangeContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ChatBot } from '@/components/chatbot/ChatBot';

export const metadata: Metadata = {
  title: 'SAC Dashboard — Ajuntament de Mataró',
  description: 'Servei d\'Atenció Ciutadana — Panel de control',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca">
      <body className="antialiased">
        <DateRangeProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto p-6">
                {children}
              </main>
            </div>
          </div>
          <ChatBot />
        </DateRangeProvider>
      </body>
    </html>
  );
}
