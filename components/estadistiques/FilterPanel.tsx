'use client';

import React, { useEffect, useState } from 'react';
import { Filter, X, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export interface StatsFilters {
  barris: string[];
  canals: string[];
  clas1s: string[];
  sentiments: string[];
  onlyAlerts: boolean;
}

export const EMPTY_FILTERS: StatsFilters = {
  barris: [],
  canals: [],
  clas1s: [],
  sentiments: [],
  onlyAlerts: false,
};

interface Props {
  filters: StatsFilters;
  onChange: (filters: StatsFilters) => void;
  onReset: () => void;
}

interface Options {
  barris: string[];
  canals: string[];
  clas1s: string[];
}

const SENTIMENT_OPTIONS = [
  { value: 'positiu', label: 'Positiu (≥ 6)' },
  { value: 'neutre', label: 'Neutre (3.5 – 6)' },
  { value: 'negatiu', label: 'Negatiu (< 3.5)' },
];

export function FilterPanel({ filters, onChange, onReset }: Props) {
  const [options, setOptions] = useState<Options>({ barris: [], canals: [], clas1s: [] });

  useEffect(() => {
    async function loadOptions() {
      try {
        // Fetch without ordering to avoid clustering on early-alphabet values.
        // Large limit ensures we see rows from all distinct values.
        const [barriRes, canalRes, clas1Res] = await Promise.all([
          supabase.from('sac_messages').select('barri').not('barri', 'is', null).limit(100000),
          supabase.from('sac_messages').select('canal').not('canal', 'is', null).limit(100000),
          supabase.from('sac_messages').select('clas1').not('clas1', 'is', null).limit(100000),
        ]);
        const unique = (arr: string[]) =>
          Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b, 'ca'));
        setOptions({
          barris: unique((barriRes.data ?? []).map((r: { barri: string }) => r.barri).filter(Boolean)),
          canals: unique((canalRes.data ?? []).map((r: { canal: string }) => r.canal).filter(Boolean)),
          clas1s: unique((clas1Res.data ?? []).map((r: { clas1: string }) => r.clas1).filter(Boolean)),
        });
      } catch { /* ignore */ }
    }
    loadOptions();
  }, []);

  const activeCount =
    filters.barris.length +
    filters.canals.length +
    filters.clas1s.length +
    filters.sentiments.length +
    (filters.onlyAlerts ? 1 : 0);

  function set(key: keyof StatsFilters, values: string[]) {
    onChange({ ...filters, [key]: values });
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Filtres</h3>
          {activeCount > 0 && (
            <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" icon={<X className="w-3 h-3" />} onClick={onReset}>
            Netejar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <MultiSelect
          label="Barri"
          placeholder="Tots els barris"
          options={options.barris.map(b => ({ value: b, label: b }))}
          selected={filters.barris}
          onChange={v => set('barris', v)}
        />
        <MultiSelect
          label="Canal"
          placeholder="Tots els canals"
          options={options.canals.map(c => ({ value: c, label: c }))}
          selected={filters.canals}
          onChange={v => set('canals', v)}
        />
        <MultiSelect
          label="Categoria"
          placeholder="Totes les categories"
          options={options.clas1s.map(c => ({
            value: c,
            label: c.length > 40 ? c.slice(0, 40) + '…' : c,
          }))}
          selected={filters.clas1s}
          onChange={v => set('clas1s', v)}
        />
        <MultiSelect
          label="Sentiment"
          placeholder="Tots els sentiments"
          options={SENTIMENT_OPTIONS}
          selected={filters.sentiments}
          onChange={v => set('sentiments', v)}
          searchable={false}
        />
      </div>

      {/* Quick toggle: critical alerts only */}
      <button
        onClick={() => onChange({ ...filters, onlyAlerts: !filters.onlyAlerts })}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
          filters.onlyAlerts
            ? 'bg-red-50 border-red-200 text-red-600'
            : 'bg-background-1 border-card-line text-muted-foreground-1 hover:bg-muted-hover',
        )}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Alertes crítiques
        {filters.onlyAlerts && <X className="w-3 h-3 ml-0.5" />}
      </button>
    </Card>
  );
}
