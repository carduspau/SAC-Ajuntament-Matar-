'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { parseSentiment } from '@/lib/sentiment';
import type { MessagesResponse, FilterState } from '@/types';

export function useMessages(filters: FilterState = {}) {
  const [data, setData] = useState<MessagesResponse>({ data: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = filters.page ?? 0;
      const pageSize = Math.min(filters.pageSize ?? 25, 100);
      const sortBy = filters.sortBy ?? 'data_inici';
      const sortDir = filters.sortDir !== 'asc';
      const allowedSorts = ['data_inici', 'barri', 'canal', 'clas1', 'sentiment', 'id'];
      const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'data_inici';

      let q = supabase
        .from('sac_messages')
        .select('*', { count: 'exact' });

      if (filters.from) q = q.gte('data_inici', filters.from.toISOString());
      if (filters.to) q = q.lte('data_inici', filters.to.toISOString());
      if (filters.barri) q = q.eq('barri', filters.barri);
      if (filters.canal) q = q.eq('canal', filters.canal);
      if (filters.clas1) q = q.eq('clas1', filters.clas1);
      if (filters.clas2) q = q.eq('clas2', filters.clas2);
      if (filters.q) q = q.ilike('message', `%${filters.q}%`);

      q = q.order(safeSort, { ascending: !sortDir });
      q = q.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data: rows, count, error: err } = await q;
      if (err) throw new Error(err.message);

      // Client-side sentiment filter (text field)
      let filtered = rows ?? [];
      if (filters.sentimentMin !== undefined || filters.sentimentMax !== undefined) {
        filtered = filtered.filter(row => {
          const s = parseSentiment(row.sentiment);
          if (s === null) return false;
          if (filters.sentimentMin !== undefined && s < filters.sentimentMin) return false;
          if (filters.sentimentMax !== undefined && s > filters.sentimentMax) return false;
          return true;
        });
      }

      setData({ data: filtered, count: count ?? 0 });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
