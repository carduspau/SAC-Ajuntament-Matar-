'use client';

import React, { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { FilterState } from '@/types';
import { supabase } from '@/lib/supabase';

type LocalFilter = Pick<FilterState, 'barri' | 'canal' | 'clas1' | 'sentimentMin' | 'sentimentMax'>;

interface Props {
  filters: LocalFilter;
  onFilterChange: <K extends keyof LocalFilter>(key: K, value: LocalFilter[K]) => void;
  onReset: () => void;
}

interface Options {
  barris: string[];
  canals: string[];
  clas1s: string[];
}

export function FilterPanel({ filters, onFilterChange, onReset }: Props) {
  const [options, setOptions] = useState<Options>({ barris: [], canals: [], clas1s: [] });

  useEffect(() => {
    async function loadOptions() {
      try {
        const [barriRes, canalRes, clas1Res] = await Promise.all([
          supabase.from('sac_messages').select('barri').not('barri', 'is', null).order('barri').limit(5000),
          supabase.from('sac_messages').select('canal').not('canal', 'is', null).order('canal').limit(5000),
          supabase.from('sac_messages').select('clas1').not('clas1', 'is', null).order('clas1').limit(5000),
        ]);
        const unique = <T,>(arr: T[]) => Array.from(new Set(arr));
        setOptions({
          barris: unique((barriRes.data ?? []).map((r: { barri: string }) => r.barri).filter(Boolean)),
          canals: unique((canalRes.data ?? []).map((r: { canal: string }) => r.canal).filter(Boolean)),
          clas1s: unique((clas1Res.data ?? []).map((r: { clas1: string }) => r.clas1).filter(Boolean)),
        });
      } catch { /* ignore */ }
    }
    loadOptions();
  }, []);

  const activeCount = [filters.barri, filters.canal, filters.clas1, filters.sentimentMin, filters.sentimentMax]
    .filter(v => v !== undefined && v !== null && v !== '').length;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Filtres</h3>
          {activeCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">{activeCount}</span>
          )}
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" icon={<X className="w-3 h-3" />} onClick={onReset}>
            Netejar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Select
          label="Barri"
          placeholder="Tots els barris"
          value={filters.barri ?? ''}
          onChange={e => onFilterChange('barri', e.target.value || undefined)}
          options={options.barris.map(b => ({ value: b, label: b }))}
        />
        <Select
          label="Canal"
          placeholder="Tots els canals"
          value={filters.canal ?? ''}
          onChange={e => onFilterChange('canal', e.target.value || undefined)}
          options={options.canals.map(c => ({ value: c, label: c }))}
        />
        <Select
          label="Categoria"
          placeholder="Totes les categories"
          value={filters.clas1 ?? ''}
          onChange={e => onFilterChange('clas1', e.target.value || undefined)}
          options={options.clas1s.map(c => ({ value: c, label: c.length > 30 ? c.slice(0, 30) + '\u2026' : c }))}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Sentiment m\u00ednim</label>
          <input
            type="number"
            min={0} max={10} step={0.5}
            value={filters.sentimentMin ?? ''}
            onChange={e => onFilterChange('sentimentMin', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="0"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Sentiment m\u00e0xim</label>
          <input
            type="number"
            min={0} max={10} step={0.5}
            value={filters.sentimentMax ?? ''}
            onChange={e => onFilterChange('sentimentMax', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="10"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>
    </Card>
  );
}
