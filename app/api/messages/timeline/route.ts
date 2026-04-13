import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { parseSentiment } from '@/lib/sentiment';
import type { TimelineBucket, TimelineGranularity } from '@/types';
import { format, parseISO } from 'date-fns';

function bucketKey(dateStr: string, granularity: TimelineGranularity): string {
  const d = parseISO(dateStr);
  switch (granularity) {
    case 'hour': return format(d, "yyyy-MM-dd'T'HH:00");
    case 'day': return format(d, 'yyyy-MM-dd');
    case 'week': {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      return format(weekStart, 'yyyy-MM-dd');
    }
    case 'month': return format(d, 'yyyy-MM');
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = sp.get('from');
  const to = sp.get('to');
  const granularity = (sp.get('granularity') ?? 'day') as TimelineGranularity;
  const barri = sp.get('barri') || null;
  const canal = sp.get('canal') || null;

  const supabase = createServerSupabase();
  let query = supabase
    .from('sac_messages')
    .select('data_inici,sentiment');

  if (from) query = query.gte('data_inici', from);
  if (to) query = query.lte('data_inici', to);
  if (barri) query = query.eq('barri', barri);
  if (canal) query = query.eq('canal', canal);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const buckets = new Map<string, { count: number; sentiments: number[] }>();
  for (const row of data ?? []) {
    if (!row.data_inici) continue;
    const key = bucketKey(row.data_inici, granularity);
    if (!buckets.has(key)) buckets.set(key, { count: 0, sentiments: [] });
    const b = buckets.get(key)!;
    b.count++;
    const s = parseSentiment(row.sentiment);
    if (s !== null) b.sentiments.push(s);
  }

  const result: TimelineBucket[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, { count, sentiments }]) => ({
      bucket,
      count,
      avg_sentiment: sentiments.length > 0
        ? Math.round((sentiments.reduce((a, b) => a + b, 0) / sentiments.length) * 10) / 10
        : null,
    }));

  return NextResponse.json(result);
}
