'use client';

import { useState, useEffect } from 'react';
import { useDateRange } from './useDateRange';
import type { StatsResponse } from '@/types';
import { buildQueryString } from '@/lib/utils';

export function useStats() {
  const { from, to } = useDateRange();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = buildQueryString({ from: from.toISOString(), to: to.toISOString() });
    fetch(`/api/messages/stats?${qs}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [from, to]);

  return { data, loading, error };
}
