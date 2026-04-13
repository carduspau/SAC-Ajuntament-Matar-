'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { computeStats } from '@/lib/aggregations';
import { useDateRange } from '@/context/DateRangeContext';
import type { StatsResponse } from '@/types';

export function useStats(barri?: string, canal?: string, clas1?: string) {
  const { from, to } = useDateRange();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('sac_messages')
        .select('id,sentiment,barri,canal,clas1,data_inici')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString());

      if (barri) q = q.eq('barri', barri);
      if (canal) q = q.eq('canal', canal);
      if (clas1) q = q.eq('clas1', clas1);

      const { data: rows, error: err } = await q;
      if (err) throw new Error(err.message);
      setData(computeStats(rows ?? []));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [from.toISOString(), to.toISOString(), barri, canal, clas1]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error };
}
