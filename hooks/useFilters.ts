'use client';

import { useState, useCallback } from 'react';
import type { FilterState } from '@/types';

export function useFilters(initial: FilterState = {}) {
  const [filters, setFilters] = useState<FilterState>(initial);

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key !== 'page' ? 0 : (value as number) }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initial);
  }, []);

  return { filters, setFilter, resetFilters, setFilters };
}
