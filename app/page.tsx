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
import { CriticalAlertsSection } from '@/components/inici/CriticalAlertsSection';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
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

      {/* Full-width Critical Alerts Section — only shown when there are critical messages */}
      <CriticalAlertsSection stats={stats} loading={statsLoading} />

      {/* Heatmap full width */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de calor: dia × hora</CardTitle>
        </CardHeader>
        <HeatmapChart data={stats?.heatmap ?? []} loading={statsLoading} />
      </Card>

      {/* Alerts + Quick Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AlertsPanel />
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-muted-foreground-1 mb-3">Accés ràpid</h2>
          <QuickNav />
        </div>
      </div>
    </div>
  );
}
