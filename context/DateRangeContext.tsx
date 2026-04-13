'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  subDays,
} from 'date-fns';
import type { PeriodType, DateRange, TimelineGranularity } from '@/types';

interface DateRangeContextValue extends DateRange {
  setPeriod: (period: PeriodType) => void;
  setCustomRange: (from: Date, to: Date) => void;
  granularity: TimelineGranularity;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

function deriveRange(period: PeriodType): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case 'day':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'year':
      return { from: startOfYear(now), to: endOfYear(now) };
    default:
      return { from: subDays(now, 30), to: now };
  }
}

function deriveGranularity(period: PeriodType): TimelineGranularity {
  switch (period) {
    case 'day': return 'hour';
    case 'week': return 'day';
    case 'month': return 'week';
    default: return 'month';
  }
}

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DateRange>(() => {
    const { from, to } = deriveRange('month');
    return { from, to, period: 'month' };
  });

  const setPeriod = useCallback((period: PeriodType) => {
    if (period === 'custom') return;
    const { from, to } = deriveRange(period);
    setState({ from, to, period });
  }, []);

  const setCustomRange = useCallback((from: Date, to: Date) => {
    setState({ from, to, period: 'custom' });
  }, []);

  return (
    <DateRangeContext.Provider
      value={{
        ...state,
        setPeriod,
        setCustomRange,
        granularity: deriveGranularity(state.period),
      }}
    >
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error('useDateRange must be used inside DateRangeProvider');
  return ctx;
}
