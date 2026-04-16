'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import type { FeatureCollection } from 'geojson';
import type { BarriStat, SacMessage } from '@/types';

const MapContainerDynamic = dynamic(
  () => import('./MapContainer'),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full rounded-xl" />,
  }
);

interface Props {
  mode: 'choropleth' | 'cluster';
  geojson: FeatureCollection;
  barriStats: BarriStat[];
  messages: SacMessage[];
  colorBy: 'count' | 'sentiment';
  onSelectMessage?: (m: SacMessage) => void;
}

export function MapView(props: Props) {
  return <MapContainerDynamic {...props} />;
}
