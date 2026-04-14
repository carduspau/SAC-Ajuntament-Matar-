'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Layers, MapPin } from 'lucide-react';
import { MapView } from '@/components/map/MapView';
import { Select } from '@/components/ui/Select';
import { useStats } from '@/hooks/useStats';
import { useDateRange } from '@/context/DateRangeContext';
import { supabase } from '@/lib/supabase';
import type { FeatureCollection } from 'geojson';
import type { SacMessage } from '@/types';
import geojsonData from '@/data/mataro-barris';

export default function MapaPage() {
  const { from, to } = useDateRange();
  const { data: stats } = useStats();
  const [mode, setMode] = useState<'choropleth' | 'cluster'>('choropleth');
  const [colorBy, setColorBy] = useState<'count' | 'sentiment'>('count');
  const [messages, setMessages] = useState<SacMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (mode !== 'cluster') return;
    setLoadingMessages(true);
    try {
      const { data } = await supabase
        .from('sac_messages')
        .select('id,saved_id,sentiment,barri,clas1,message,lat,lng,canal,data_inici')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString())
        .limit(1000);
      setMessages((data ?? []) as SacMessage[]);
    } catch { setMessages([]); } finally { setLoadingMessages(false); }
  }, [mode, from.toISOString(), to.toISOString()]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-muted-hover rounded-lg p-1 gap-0.5">
          <button
            onClick={() => setMode('choropleth')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none ${
              mode === 'choropleth' ? 'bg-layer text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-4 h-4" />
            Per àrees
          </button>
          <button
            onClick={() => setMode('cluster')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none ${
              mode === 'cluster' ? 'bg-layer text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Per punts
          </button>
        </div>

        {mode === 'choropleth' && (
          <div className="w-44">
            <Select
              value={colorBy}
              onChange={e => setColorBy(e.target.value as 'count' | 'sentiment')}
              options={[
                { value: 'count', label: 'Color per quantitat' },
                { value: 'sentiment', label: 'Color per sentiment' },
              ]}
            />
          </div>
        )}

        {mode === 'cluster' && loadingMessages && (
          <span className="text-sm text-muted-foreground">Carregant punts...</span>
        )}
        {mode === 'cluster' && !loadingMessages && (
          <span className="text-sm text-muted-foreground">{messages.filter(m => m.lat && m.lng).length} punts visibles</span>
        )}

        {/* Choropleth legend */}
        {mode === 'choropleth' && colorBy === 'count' && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">Menys</span>
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
              <div
                key={i}
                className="w-6 h-4 rounded-sm"
                style={{ backgroundColor: `rgba(${Math.round(239 - v * 200)},${Math.round(246 - v * 200)},255,0.75)` }}
              />
            ))}
            <span className="text-xs text-muted-foreground">Més</span>
          </div>
        )}
        {mode === 'choropleth' && colorBy === 'sentiment' && (
          <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Crític</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Negatiu</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Neutral</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Positiu</span>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 min-h-[500px] rounded-xl overflow-hidden border border-card-line shadow-xs">
        <MapView
          mode={mode}
          geojson={geojsonData as FeatureCollection}
          barriStats={stats?.by_barri ?? []}
          messages={messages}
          colorBy={colorBy}
        />
      </div>
    </div>
  );
}
