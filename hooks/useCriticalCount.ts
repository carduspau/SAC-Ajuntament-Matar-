'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { parseSentiment } from '@/lib/sentiment';
import { startOfMonth, endOfMonth } from 'date-fns';

export function useCriticalCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const from = startOfMonth(new Date());
    const to = endOfMonth(new Date());

    supabase
      .from('sac_messages')
      .select('sentiment')
      .gte('data_inici', from.toISOString())
      .lte('data_inici', to.toISOString())
      .then(({ data }) => {
        if (!data) return;
        const n = data.filter(r => {
          const s = parseSentiment(r.sentiment);
          return s !== null && s < 3.5;
        }).length;
        setCount(n);
      });
  }, []);

  return count;
}
