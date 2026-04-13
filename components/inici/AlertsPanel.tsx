'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDateRange } from '@/context/DateRangeContext';
import { formatDate, truncate, buildQueryString } from '@/lib/utils';
import { parseSentiment } from '@/lib/sentiment';
import type { SacMessage } from '@/types';
import Link from 'next/link';

export function AlertsPanel() {
  const { from, to } = useDateRange();
  const [alerts, setAlerts] = useState<SacMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = buildQueryString({
      from: from.toISOString(),
      to: to.toISOString(),
      sortBy: 'sentiment',
      sortDir: 'asc',
      pageSize: 10,
    });
    fetch(`/api/messages?${qs}`)
      .then(r => r.json())
      .then(d => {
        const criticals = (d.data ?? []).filter((m: SacMessage) => {
          const s = parseSentiment(m.sentiment);
          return s !== null && s < 3.5;
        });
        setAlerts(criticals.slice(0, 6));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [from, to]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          Alertes crítiques
        </CardTitle>
        <Link
          href={`/missatges?sentimentMax=3.5`}
          className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
        >
          Veure totes <ChevronRight className="w-3 h-3" />
        </Link>
      </CardHeader>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
            <span className="text-emerald-600 text-lg">✓</span>
          </div>
          <p className="text-sm text-gray-500">No hi ha alertes crítiques</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const score = parseSentiment(alert.sentiment);
            return (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100"
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-red-600">{score?.toFixed(1)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700">{alert.barri ?? '—'}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">{formatDate(alert.data_inici, 'dd/MM/yyyy')}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{truncate(alert.message, 100)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
