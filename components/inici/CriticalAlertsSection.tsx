'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useDateRange } from '@/context/DateRangeContext';
import { parseSentiment } from '@/lib/sentiment';
import { Card, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn, formatDate, truncate } from '@/lib/utils';
import type { StatsResponse, SacMessage } from '@/types';

const CriticalAlertsSectionMap = dynamic(
  () => import('./CriticalAlertsSectionMap').then((m) => ({ default: m.CriticalAlertsSectionMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground-2">
        Carregant mapa...
      </div>
    ),
  }
);

interface CritCategory { cat: string; count: number; }
interface Props { stats: StatsResponse | null; loading: boolean; }

function severityColor(avg: number | null): string {
  if (avg === null) return '#9ca3af';
  if (avg < 3) return '#dc2626';
  if (avg < 5) return '#f97316';
  return '#f59e0b';
}

export function CriticalAlertsSection({ stats, loading }: Props) {
  const { from, to } = useDateRange();
  const router = useRouter();
  const [mapPoints, setMapPoints] = useState<SacMessage[]>([]);
  const [critCategories, setCritCategories] = useState<CritCategory[]>([]);
  const [critMessages, setCritMessages] = useState<SacMessage[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('sac_messages')
        .select('*')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString())
        .limit(2000);

      if (error || !data) return;

      const critical = data.filter((r) => {
        const s = parseSentiment(r.sentiment);
        return s !== null && s < 3.5;
      }) as SacMessage[];

      setMapPoints(critical.filter(r => r.lat !== null && r.lng !== null));
      setCritMessages(critical.slice(0, 20));

      const catMap = new Map<string, number>();
      for (const r of critical) {
        const cat = r.clas1 ?? 'Desconegut';
        catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
      }
      setCritCategories(
        Array.from(catMap.entries())
          .map(([cat, count]) => ({ cat, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
      );
    }
    fetchData();
  }, [from.toISOString(), to.toISOString()]);

  if (!stats || stats.critical_count === 0) return null;

  const topBarris = [...stats.by_barri]
    .sort((a, b) => b.critical_count - a.critical_count)
    .slice(0, 8);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <h2 className="text-sm font-semibold text-foreground">Alertes crítiques del període</h2>
        <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
          {stats.critical_count.toLocaleString('ca-ES')}
        </span>
      </div>

      {/* 3-column equal-height grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Column 1: Barris (top) + Categories chart (bottom) */}
        <div className="flex flex-col gap-5">
          <Card className="flex-1">
            <p className="text-sm font-semibold text-muted-foreground-1 uppercase tracking-wide mb-4">Barris afectats</p>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : (
              <ul className="space-y-2">
                {topBarris.map((b) => (
                  <li key={b.barri} className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: severityColor(b.avg_sentiment) }} />
                    <span className="flex-1 text-xs text-foreground truncate">{b.barri}</span>
                    <span className="text-xs text-muted-foreground-2 whitespace-nowrap">{b.critical_count} crítics</span>
                    {b.avg_sentiment !== null && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap bg-red-100 text-red-600">
                        {b.avg_sentiment.toFixed(1)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex-1 flex flex-col min-h-0">
            <p className="text-sm font-semibold text-muted-foreground-1 uppercase tracking-wide mb-4 shrink-0">Per categoria</p>
            <div className="flex-1 min-h-0">
              {critCategories.length === 0 ? (
                <Skeleton className="h-full w-full min-h-[120px]" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={critCategories} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="cat" tick={{ fontSize: 10 }} width={110} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [v, 'Missatges']} />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                      {critCategories.map((_, i) => <Cell key={i} fill="#ef4444" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Column 2: Map (full height) */}
        <Card className="flex flex-col min-h-[420px] overflow-hidden" padding={false}>
          <div className="px-5 pt-4 pb-3 shrink-0">
            <p className="text-sm font-semibold text-muted-foreground-1 uppercase tracking-wide">Mapa d&apos;alertes</p>
          </div>
          <div className="flex-1 min-h-0 cursor-pointer" onClick={() => router.push('/alertes')}>
            <CriticalAlertsSectionMap points={mapPoints} />
          </div>
        </Card>

        {/* Column 3: Critical messages (fills height) */}
        <Card className="flex flex-col overflow-hidden" padding={false}>
          <div className="px-5 pt-4 pb-3 border-b border-card-line shrink-0 flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground-1 uppercase tracking-wide">Missatges crítics</p>
            <Link href="/alertes" className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
              Veure tots <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb [&::-webkit-scrollbar-thumb]:rounded-full">
            {critMessages.length === 0 ? (
              loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground-2 text-center py-6">Sense missatges crítics</p>
              )
            ) : critMessages.map((msg) => {
              const score = parseSentiment(msg.sentiment);
              return (
                <div key={msg.id} className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-red-600">{score?.toFixed(1)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-foreground truncate">{msg.barri ?? '—'}</span>
                      <span className="text-xs text-muted-foreground-2 shrink-0">{formatDate(msg.data_inici, 'dd/MM/yyyy')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground-1 line-clamp-2">{truncate(msg.message, 100)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </section>
  );
}
