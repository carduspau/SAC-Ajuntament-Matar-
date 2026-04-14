'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { useDateRange } from '@/context/DateRangeContext';
import { cn } from '@/lib/utils';
import type { PeriodType } from '@/types';

const PERIODS: { value: PeriodType; label: string }[] = [
  { value: 'day', label: 'Avui' },
  { value: 'week', label: 'Setmana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Any' },
  { value: 'custom', label: 'Personalitzat' },
];

export function DateRangePicker() {
  const { from, to, period, setPeriod, setCustomRange } = useDateRange();
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(format(from, 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(to, 'yyyy-MM-dd'));

  function handlePeriodClick(p: PeriodType) {
    if (p === 'custom') {
      setShowCustom(v => !v);
    } else {
      setShowCustom(false);
      setPeriod(p);
    }
  }

  function applyCustom() {
    const f = new Date(customFrom + 'T00:00:00');
    const t = new Date(customTo + 'T23:59:59');
    if (!isNaN(f.getTime()) && !isNaN(t.getTime())) {
      setCustomRange(f, t);
      setShowCustom(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => handlePeriodClick(p.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
              period === p.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span>
          {format(from, 'dd MMM yyyy', { locale: ca })}
          {' '}–{' '}
          {format(to, 'dd MMM yyyy', { locale: ca })}
        </span>
      </div>

      {showCustom && (
        <div className="absolute top-16 right-4 z-40 bg-white rounded-xl border border-gray-200 shadow-xl p-4 flex flex-col gap-3 min-w-[280px]">
          <p className="text-sm font-semibold text-gray-700">Rang personalitzat</p>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">Des de</label>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">Fins a</label>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={applyCustom}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
