'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MessagesResponse, FilterState } from '@/types';
import { buildQueryString } from '@/lib/utils';

export function useMessages(filters: FilterState = {}) {
  const [data, setData] = useState<MessagesResponse>({ data: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number | boolean | undefined | null> = {
      from: filters.from?.toISOString(),
      to: filters.to?.toISOString(),
      barri: filters.barri,
      canal: filters.canal,
      clas1: filters.clas1,
      clas2: filters.clas2,
      sentimentMin: filters.sentimentMin,
      sentimentMax: filters.sentimentMax,
      q: filters.q,
      page: filters.page ?? 0,
      pageSize: filters.pageSize ?? 20,
      sortBy: filters.sortBy ?? 'data_inici',
      sortDir: filters.sortDir ?? 'desc',
    };
    const qs = buildQueryString(params);
    fetch(`/api/messages?${qs}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
