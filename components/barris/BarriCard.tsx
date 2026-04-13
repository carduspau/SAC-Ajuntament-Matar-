'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SentimentBadge } from '@/components/ui/Badge';
import { SparklineChart } from '@/components/charts/SparklineChart';
import { sentimentColor } from '@/lib/sentiment';
import { buildQueryString } from '@/lib/utils';
import type { BarriStat } from '@/types';

interface Props {
  stat: BarriStat;
  from: Date;
  to: Date;
  maxCount: number;
}

export function BarriCard({ stat, from, to, maxCount }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [timeline, setTimeline] = useState<{ value: number }[]>([]);

  useEffect(() => {
    if (!expanded) return;
    const qs = buildQueryString({ from: from.toISOString(), to: to.toISOString(), barri: stat.barri, granularity: 'day' });
    fetch(`/api/messages/timeline?${qs}`)
      .then(r => r.json())
      .then(d => setTimeline((d ?? []).map((b: any) => ({ value: b.count }))))
      .catch(() => {});
  }, [expanded, stat.barri, from.toISOString(), to.toISOString()]);

  const pct = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{stat.barri}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{stat.top_category ?? '—'}</p>
        </div>
        <SentimentBadge value={stat.avg_sentiment !== null ? String(stat.avg_sentiment.toFixed(2)) : null} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xl font-bold text-gray-900">{stat.count.toLocaleString('ca-ES')}</span>
          <span className="text-xs text-gray-400">missatges</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: sentimentColor(stat.avg_sentiment) }}
          />
        </div>
      </div>

      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        {expanded ? <><ChevronUp className="w-3 h-3" /> Menys detall</> : <><ChevronDown className="w-3 h-3" /> Veure evolució</>}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 pt-3">
          {timeline.length > 0 ? (
            <SparklineChart data={timeline} color={sentimentColor(stat.avg_sentiment)} height={60} />
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">Carregant...</p>
          )}
        </div>
      )}
    </Card>
  );
}
