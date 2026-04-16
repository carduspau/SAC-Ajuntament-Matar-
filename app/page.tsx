'use client';

import React from 'react';
import {
  MissatgesCard,
  SentimentCard,
  AlertesCard,
  CategoriesCard,
} from '@/components/inici/SummaryCards';
import { AlertsPanel } from '@/components/inici/AlertsPanel';
import { QuickNav } from '@/components/inici/QuickNav';
import { CategoriesChart } from '@/components/inici/CategoriesChart';
import { CanalChart } from '@/components/inici/CanalChart';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { useStats } from '@/hooks/useStats';
import { useTimeline } from '@/hooks/useTimeline';
import { useDateRange } from '@/context/DateRangeContext';

export default function InicioPage() {
  const { data: stats, loading: statsLoading } = useStats();
  const { data: timeline, loading: timelineLoading } = useTimeline();
  const { granularity, from, to } = useDateRange();

  const topLoading = statsLoading || timelineLoading;

  return (
    <div className="space-y-6">
      {/* 4 Rich Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        <MissatgesCard
          stats={stats}
          timeline={timeline}
          loading={topLoading}
          granularity={granularity}
          from={from}
          to={to}
        />
        <SentimentCard
          stats={stats}
          timeline={timeline}
          loading={topLoading}
          granularity={granularity}
        />
        <AlertesCard
          stats={stats}
          loading={statsLoading}
        />
        <CategoriesCard
          stats={stats}
          loading={statsLoading}
        />
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolució temporal</CardTitle>
        </CardHeader>
        <TimelineChart
          data={timeline}
          loading={timelineLoading}
          granularity={granularity}
          height={300}
          showSentiment
        />
      </Card>

      {/* Categories + Canal charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoriesChart data={stats?.by_clas1 ?? []} loading={statsLoading} />
        <CanalChart data={stats?.by_canal ?? []} loading={statsLoading} />
      </div>

      {/* Alerts + Quick Nav + Top barris */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AlertsPanel />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground-1 mb-3">Accés ràpid</h2>
            <QuickNav />
          </div>

          {/* Top barris */}
          {!statsLoading && stats && stats.by_barri.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top barris</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                {stats.by_barri.slice(0, 5).map((b, i) => (
                  <div key={b.barri} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground-2 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-foreground truncate">{b.barri}</span>
                        <span className="text-sm font-semibold text-foreground ml-2 shrink-0">
                          {b.count.toLocaleString('ca-ES')}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(b.count / stats.by_barri[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
