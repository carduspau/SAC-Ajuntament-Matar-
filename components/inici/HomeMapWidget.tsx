'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { parseSentiment } from '@/lib/sentiment';
import { useDateRange } from '@/context/DateRangeContext';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import type { BarriPoint } from './HomeMapInner';

const HomeMapInner = dynamic(
  () => import('./HomeMapInner').then((m) => ({ default: m.HomeMapInner })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 animate-pulse bg-muted-hover rounded-xl" />
    ),
  }
);

export function HomeMapWidget() {
  const { from, to } = useDateRange();
  const [points, setPoints] = useState<BarriPoint[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('sac_messages')
        .select('barri, lat, lng, sentiment')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString())
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(5000);

      if (error || !data) return;

      // Group by barri
      const barriMap = new Map<
        string,
        { lats: number[]; lngs: number[]; sentiments: number[] }
      >();

      for (const row of data) {
        if (!row.barri || row.lat == null || row.lng == null) continue;
        const existing = barriMap.get(row.barri);
        const score = parseSentiment(row.sentiment);
        if (existing) {
          existing.lats.push(row.lat);
          existing.lngs.push(row.lng);
          if (score !== null) existing.sentiments.push(score);
        } else {
          barriMap.set(row.barri, {
            lats: [row.lat],
            lngs: [row.lng],
            sentiments: score !== null ? [score] : [],
          });
        }
      }

      const result: BarriPoint[] = [];
      for (const [barri, { lats, lngs, sentiments }] of barriMap.entries()) {
        const count = lats.length;
        const lat = lats.reduce((s, v) => s + v, 0) / count;
        const lng = lngs.reduce((s, v) => s + v, 0) / count;
        const avg_sentiment =
          sentiments.length > 0
            ? sentiments.reduce((s, v) => s + v, 0) / sentiments.length
            : null;
        result.push({ barri, lat, lng, count, avg_sentiment });
      }

      setPoints(result);
    }

    fetchData();
  }, [from.toISOString(), to.toISOString()]);

  return (
    <Card padding={false}>
      <div className="p-5 pb-0">
        <CardHeader>
          <CardTitle>Distribució per barris</CardTitle>
          <Link
            href="/mapa"
            className="text-xs text-primary hover:underline"
          >
            Veure mapa →
          </Link>
        </CardHeader>
      </div>
      <div style={{ height: 280 }} className="px-3 pb-3">
        <HomeMapInner points={points} />
      </div>
    </Card>
  );
}
