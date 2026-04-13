'use client';

import { useState, useEffect } from 'react';
import { useDateRange } from './useDateRange';
import type { TimelineBucket } from '@/types';
import { buildQueryString } from '@/lib/utils';

export function useTimeline() {
  const { from, to, granularity } = useDateRange();
  const [data, setData] = useState<TimelineBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const qs = buildQueryString({
      from: from.toISOString(),
      to: to.toISOString(),
      granularity,
    });
    fetch(`/api/messages/timeline?${qs}`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [from, to, granularity]);

  return { data, loading, error };
}
