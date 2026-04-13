'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { computeTimeline } from '@/lib/aggregations';
import { useDateRange } from '@/context/DateRangeContext';
import type { TimelineBucket } from '@/types';

export function useTimeline(barri?: string, canal?: string) {
  const { from, to, granularity } = useDateRange();
  const [data, setData] = useState<TimelineBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('sac_messages')
        .select('data_inici,sentiment')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString());

      if (barri) q = q.eq('barri', barri);
      if (canal) q = q.eq('canal', canal);

      const { data: rows, error: err } = await q;
      if (err) throw new Error(err.message);
      setData(computeTimeline(rows ?? [], granularity));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [from.toISOString(), to.toISOString(), granularity, barri, canal]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error };
}
