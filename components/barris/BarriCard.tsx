'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge, SentimentBadge } from '@/components/ui/Badge';
import { SparklineChart } from '@/components/charts/SparklineChart';
import { sentimentColor } from '@/lib/sentiment';
import { supabase } from '@/lib/supabase';
import { computeTimeline } from '@/lib/aggregations';
import type { BarriStat } from '@/types';

interface Props {
  stat: BarriStat;
  from: Date;
  to: Date;
  maxCount: number;
  onClick?: () => void;
}

export function BarriCard({ stat, from, to, maxCount, onClick }: Props) {
  const [timeline, setTimeline] = useState<{ value: number }[]>([]);
  const [canals, setCanals] = useState<{ canal: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from('sac_messages')
        .select('data_inici, sentiment, canal')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString())
        .eq('barri', stat.barri);

      if (!cancelled && data) {
        const buckets = computeTimeline(data, 'day');
        setTimeline(buckets.map(b => ({ value: b.count })));

        const canalMap = new Map<string, number>();
        for (const row of data) {
          const c = row.canal ?? 'Desconegut';
          canalMap.set(c, (canalMap.get(c) ?? 0) + 1);
        }
        setCanals(
          Array.from(canalMap.entries())
            .map(([canal, count]) => ({ canal, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4)
        );
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [stat.barri, from.toISOString(), to.toISOString()]);

  const pct = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;

  return (
    <div
      className={onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary/30 rounded-xl transition-all' : undefined}
      onClick={onClick}
    >
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{stat.barri}</h3>
          {stat.top_category && (
            <Badge variant="info" className="mt-1 text-xs">{stat.top_category}</Badge>
          )}
        </div>
        <SentimentBadge value={stat.avg_sentiment !== null ? String(stat.avg_sentiment.toFixed(2)) : null} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xl font-bold text-foreground">{stat.count.toLocaleString('ca-ES')}</span>
          <span className="text-xs text-muted-foreground-2">missatges</span>
        </div>
        <div className="h-1.5 bg-muted-hover rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: sentimentColor(stat.avg_sentiment) }}
          />
        </div>
      </div>

      <div className="border-t border-card-line pt-3 space-y-4">
        {loading ? (
          <p className="text-xs text-muted-foreground-2 text-center py-4">Carregant...</p>
        ) : (
          <>
            {timeline.length > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Evolució diària</p>
                <SparklineChart data={timeline} color={sentimentColor(stat.avg_sentiment)} height={60} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground-2 text-center py-2">Sense dades en aquest període</p>
            )}

            {canals.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Per canal</p>
                <div className="space-y-1.5">
                  {canals.map(({ canal, count }) => (
                    <div key={canal} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground-1 w-32 truncate shrink-0">{canal}</span>
                      <div className="flex-1 h-1.5 bg-muted-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full"
                          style={{ width: `${(count / stat.count) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
    </div>
  );
}
