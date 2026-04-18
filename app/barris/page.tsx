'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BarriCard } from '@/components/barris/BarriCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useStats } from '@/hooks/useStats';
import { useDateRange } from '@/context/DateRangeContext';
import type { BarriStat } from '@/types';

export default function BarrisPage() {
  const { data: stats, loading } = useStats();
  const { from, to } = useDateRange();
  const router = useRouter();

  const barris: BarriStat[] = stats?.by_barri ?? [];
  const maxCount = barris[0]?.count ?? 1;

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : barris.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground-2">
          No s'han trobat barris en aquest període
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {barris.map(stat => (
            <BarriCard
              key={stat.barri}
              stat={stat}
              from={from}
              to={to}
              maxCount={maxCount}
              onClick={() => router.push(`/estadistiques?barri=${encodeURIComponent(stat.barri)}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
