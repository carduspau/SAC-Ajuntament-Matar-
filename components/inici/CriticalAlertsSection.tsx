'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useDateRange } from '@/context/DateRangeContext';
import { parseSentiment } from '@/lib/sentiment';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { StatsResponse, SacMessage } from '@/types';
import { MessageDetail } from '@/components/missatges/MessageDetail';

const CriticalAlertsSectionMap = dynamic(
  () =>
    import('./CriticalAlertsSectionMap').then((m) => ({
      default: m.CriticalAlertsSectionMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground-2">
        Carregant mapa...
      </div>
    ),
  }
);

interface CritCategory {
  cat: string;
  count: number;
}

interface Props {
  stats: StatsResponse | null;
  loading: boolean;
}

function severityBarColor(avgSentiment: number | null): string {
  if (avgSentiment === null) return '#9ca3af';
  if (avgSentiment < 3) return '#dc2626';
  if (avgSentiment < 5) return '#f97316';
  return '#f59e0b';
}

export function CriticalAlertsSection({ stats, loading }: Props) {
  const { from, to } = useDateRange();
  const [mapPoints, setMapPoints] = useState<SacMessage[]>([]);
  const [critCategories, setCritCategories] = useState<CritCategory[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<SacMessage | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('sac_messages')
        .select('*')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString())
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(2000);

      if (error || !data) return;

      const filtered = data.filter((r) => {
        const score = parseSentiment(r.sentiment);
        return score !== null && score < 3.5;
      }) as SacMessage[];

      setMapPoints(filtered);

      // Group by clas1 for category chart
      const catMap = new Map<string, number>();
      for (const r of filtered) {
        const cat = r.clas1 ?? 'Desconegut';
        catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
      }

      const sorted = Array.from(catMap.entries())
        .map(([cat, count]) => ({ cat, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setCritCategories(sorted);
    }

    fetchData();
  }, [from.toISOString(), to.toISOString()]);

  if (!stats || stats.critical_count === 0) return null;

  const topBarris = stats.by_barri
    .filter((b) => b.critical_count > 0)
    .sort((a, b) => b.critical_count - a.critical_count)
    .slice(0, 6);

  const topBarrisChart = stats.by_barri
    .filter((b) => b.critical_count > 0)
    .sort((a, b) => b.critical_count - a.critical_count)
    .slice(0, 5);

  return (
    <section className="space-y-4">
      {/* Section heading */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <h2 className="text-sm font-semibold text-foreground">
          Alertes crítiques del període
        </h2>
        <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
          {stats.critical_count.toLocaleString('ca-ES')}
        </span>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Barris afectats */}
        <Card>
          <CardHeader>
            <CardTitle>Barris afectats</CardTitle>
          </CardHeader>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {topBarris.map((b) => (
                <li key={b.barri} className="flex items-center gap-2">
                  <div
                    className="w-1 h-5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: severityBarColor(b.avg_sentiment),
                    }}
                  />
                  <span className="flex-1 text-xs text-foreground truncate">
                    {b.barri}
                  </span>
                  <span className="text-xs text-muted-foreground-2 whitespace-nowrap">
                    {b.critical_count} crítics
                  </span>
                  {b.avg_sentiment !== null && (
                    <span
                      className={cn(
                        'text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap',
                        'bg-red-100 text-red-600'
                      )}
                    >
                      {b.avg_sentiment.toFixed(1)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Column 2: Map */}
        <Card className="flex flex-col overflow-hidden min-h-[320px]" padding={false}>
          <div className="px-5 pt-5 pb-3 shrink-0">
            <CardHeader className="mb-0">
              <CardTitle>Mapa d&apos;alertes</CardTitle>
            </CardHeader>
          </div>
          <div className="flex-1 min-h-0">
            <CriticalAlertsSectionMap points={mapPoints} onSelect={setSelectedMessage} />
          </div>
        </Card>

        {/* Column 3: Charts */}
        <Card>
          {/* Top: Per categoria */}
          <CardHeader>
            <CardTitle>Per categoria</CardTitle>
          </CardHeader>
          {critCategories.length === 0 ? (
            <Skeleton className="h-[140px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={critCategories}
                layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="cat"
                  tick={{ fontSize: 10 }}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(value: number) => [value, 'Missatges']}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {critCategories.map((_, index) => (
                    <Cell key={`cell-cat-${index}`} fill="#ef4444" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Divider */}
          <div className="border-t border-card-line my-3" />

          {/* Bottom: Per barri */}
          <CardHeader>
            <CardTitle>Per barri</CardTitle>
          </CardHeader>
          {topBarrisChart.length === 0 ? (
            <Skeleton className="h-[140px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={topBarrisChart.map((b) => ({
                  name: b.barri,
                  count: b.critical_count,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(value: number) => [value, 'Crítics']}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {topBarrisChart.map((_, index) => (
                    <Cell key={`cell-barri-${index}`} fill="#f97316" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      <MessageDetail message={selectedMessage} onClose={() => setSelectedMessage(null)} />
    </section>
  );
}
