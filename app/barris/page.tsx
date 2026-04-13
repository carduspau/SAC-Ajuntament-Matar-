'use client';

import React, { useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { BarriCard } from '@/components/barris/BarriCard';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useStats } from '@/hooks/useStats';
import { useDateRange } from '@/context/DateRangeContext';
import type { BarriStat } from '@/types';

type SortKey = 'count' | 'sentiment' | 'name';

export default function BarrisPage() {
  const { data: stats, loading } = useStats();
  const { from, to } = useDateRange();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('count');

  const barris: BarriStat[] = stats?.by_barri ?? [];
  const maxCount = barris[0]?.count ?? 1;

  const filtered = barris
    .filter(b => !search || b.barri.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'count') return b.count - a.count;
      if (sortKey === 'sentiment') return (a.avg_sentiment ?? 0) - (b.avg_sentiment ?? 0);
      return a.barri.localeCompare(b.barri);
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <Input
            label="Cercar barri"
            placeholder="Nom del barri..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-44">
          <Select
            label="Ordenar per"
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            options={[
              { value: 'count', label: 'Nombre de missatges' },
              { value: 'sentiment', label: 'Sentiment (menor primer)' },
              { value: 'name', label: 'Nom alfabètic' },
            ]}
          />
        </div>
        <div className="text-sm text-gray-500 pb-0.5">{filtered.length} barris</div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No s'han trobat barris amb la cerca "{search}"
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(stat => (
            <BarriCard
              key={stat.barri}
              stat={stat}
              from={from}
              to={to}
              maxCount={maxCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
