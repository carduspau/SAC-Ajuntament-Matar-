'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useDateRange } from '@/context/DateRangeContext';
import { parseSentiment } from '@/lib/sentiment';

interface EnrichedRow {
  intent: string | null;
  department: string | null;
  action_required: string | null;
  followup_needed: boolean | null;
  language: string | null;
  citizen_experience_signal: string | null;
  sentiment: string | null;
}

export interface EnrichedStat { key: string; count: number; pct: number }

export interface DeptStat {
  dept: string;
  count: number;
  followup_count: number;
  followup_pct: number;
  avg_sentiment: number | null;
  top_intent: string | null;
  top_action: string | null;
  by_intent: Record<string, number>;
  by_action: Record<string, number>;
}

export interface EnrichedStats {
  total: number;
  followup_count: number;
  followup_pct: number;
  by_intent: EnrichedStat[];
  by_department: DeptStat[];
  by_action: EnrichedStat[];
  by_language: EnrichedStat[];
  by_experience: EnrichedStat[];
}

function toStats(map: Map<string, number>, total: number): EnrichedStat[] {
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count, pct: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

function topKey(m: Map<string, number>): string | null {
  if (m.size === 0) return null;
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function useEnrichedStats() {
  const { from, to } = useDateRange();
  const [data, setData] = useState<EnrichedStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from('sac_messages')
        .select('intent,department,action_required,followup_needed,language,citizen_experience_signal,sentiment')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString());

      const msgs = (rows ?? []) as EnrichedRow[];
      const total = msgs.length;

      const intentMap  = new Map<string, number>();
      const actionMap  = new Map<string, number>();
      const langMap    = new Map<string, number>();
      const expMap     = new Map<string, number>();
      const deptRows   = new Map<string, EnrichedRow[]>();
      let followupCount = 0;

      for (const m of msgs) {
        const inc = (mp: Map<string, number>, k: string | null) => { if (k) mp.set(k, (mp.get(k) ?? 0) + 1); };
        inc(intentMap, m.intent);
        inc(actionMap, m.action_required);
        inc(langMap,   m.language);
        inc(expMap,    m.citizen_experience_signal);
        if (m.followup_needed) followupCount++;
        const dept = m.department ?? 'general';
        if (!deptRows.has(dept)) deptRows.set(dept, []);
        deptRows.get(dept)!.push(m);
      }

      const byDept: DeptStat[] = Array.from(deptRows.entries()).map(([dept, drows]) => {
        const fc = drows.filter(r => r.followup_needed).length;
        const scores = drows.map(r => parseSentiment(r.sentiment)).filter((s): s is number => s !== null);
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        const iMap = new Map<string, number>();
        const aMap = new Map<string, number>();
        for (const r of drows) {
          if (r.intent)           iMap.set(r.intent,           (iMap.get(r.intent)           ?? 0) + 1);
          if (r.action_required)  aMap.set(r.action_required,  (aMap.get(r.action_required)  ?? 0) + 1);
        }
        return {
          dept,
          count: drows.length,
          followup_count: fc,
          followup_pct: drows.length > 0 ? (fc / drows.length) * 100 : 0,
          avg_sentiment: avg,
          top_intent: topKey(iMap),
          top_action: topKey(aMap),
          by_intent: Object.fromEntries(iMap),
          by_action: Object.fromEntries(aMap),
        };
      }).sort((a, b) => b.count - a.count);

      setData({
        total,
        followup_count: followupCount,
        followup_pct: total > 0 ? (followupCount / total) * 100 : 0,
        by_intent: toStats(intentMap, total),
        by_department: byDept,
        by_action: toStats(actionMap, total),
        by_language: toStats(langMap, total),
        by_experience: toStats(expMap, total),
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from.toISOString(), to.toISOString()]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading };
}
