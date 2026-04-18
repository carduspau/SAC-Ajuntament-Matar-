'use client';

import React, { useRef, useMemo } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { downloadPng, downloadCsv, ChartDownloadButtons } from '@/components/ui/ChartDownload';

const DAYS = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}h`);

interface Props {
  data: { day: number; hour: number; count: number }[];
  loading?: boolean;
  title?: string;
}

export function HeatmapChart({ data, loading, title }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const maxCount = useMemo(() => Math.max(...data.map(d => d.count), 1), [data]);

  const grid = useMemo(() => {
    const g: Record<string, number> = {};
    for (const d of data) g[`${d.day}_${d.hour}`] = d.count;
    return g;
  }, [data]);

  if (loading) return <Skeleton className="w-full h-48" />;

  function cellColor(count: number): string {
    if (count === 0) return '#f3f4f6';
    const intensity = count / maxCount;
    const opacity = 0.15 + intensity * 0.85;
    return `rgba(99, 102, 241, ${opacity})`;
  }

  const csvData = DAYS.flatMap((day, dayIdx) =>
    HOURS.map((hour, hourIdx) => ({
      Dia: day,
      Hora: hour,
      Missatges: grid[`${dayIdx}_${hourIdx}`] ?? 0,
    }))
  );

  return (
    <div ref={ref} className="relative overflow-x-auto">
      {title && (
        <div className="absolute top-0 right-0 z-10">
          <ChartDownloadButtons
            onPng={() => ref.current && downloadPng(ref.current, title)}
            onCsv={() => downloadCsv(title, csvData)}
          />
        </div>
      )}
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex ml-8 mb-1">
          {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
            <div key={h} className="text-xs text-muted-foreground-2" style={{ width: `${100 / 8}%` }}>{HOURS[h]}</div>
          ))}
        </div>
        {/* Grid */}
        {DAYS.map((day, dayIdx) => (
          <div key={day} className="flex items-center mb-0.5">
            <div className="w-8 text-xs text-muted-foreground shrink-0">{day}</div>
            <div className="flex flex-1 gap-0.5">
              {HOURS.map((_, hourIdx) => {
                const count = grid[`${dayIdx}_${hourIdx}`] ?? 0;
                return (
                  <div
                    key={hourIdx}
                    className="flex-1 h-5 rounded-sm cursor-pointer"
                    style={{ backgroundColor: cellColor(count) }}
                    title={`${day} ${HOURS[hourIdx]}: ${count} missatges`}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-2 mt-2 ml-8">
          <span className="text-xs text-muted-foreground">Menys</span>
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <div
              key={v}
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: v === 0 ? '#f3f4f6' : `rgba(99,102,241,${0.15 + v * 0.85})` }}
            />
          ))}
          <span className="text-xs text-muted-foreground">Més</span>
        </div>
      </div>
    </div>
  );
}
