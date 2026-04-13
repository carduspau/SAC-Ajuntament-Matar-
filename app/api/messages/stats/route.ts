import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { parseSentiment } from '@/lib/sentiment';
import type { StatsResponse } from '@/types';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = sp.get('from');
  const to = sp.get('to');
  const barri = sp.get('barri') || null;
  const canal = sp.get('canal') || null;
  const clas1 = sp.get('clas1') || null;

  const supabase = createServerSupabase();

  // Fetch all messages for the period (for aggregation)
  let allQuery = supabase.from('sac_messages').select('id,sentiment,barri,canal,clas1,data_inici');
  if (from) allQuery = allQuery.gte('data_inici', from);
  if (to) allQuery = allQuery.lte('data_inici', to);
  if (barri) allQuery = allQuery.eq('barri', barri);
  if (canal) allQuery = allQuery.eq('canal', canal);
  if (clas1) allQuery = allQuery.eq('clas1', clas1);
  const { data: allData, count: totalCount } = await allQuery;

  const rows = allData ?? [];

  // Compute aggregations
  const sentiments = rows.map(r => parseSentiment(r.sentiment)).filter(s => s !== null) as number[];
  const avgSentiment = sentiments.length > 0
    ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
    : null;
  const criticalCount = sentiments.filter(s => s < 3).length;

  // By barri
  const barriMap = new Map<string, { count: number; sentiments: number[]; categories: Map<string, number> }>();
  for (const r of rows) {
    const b = r.barri ?? 'Desconegut';
    if (!barriMap.has(b)) barriMap.set(b, { count: 0, sentiments: [], categories: new Map() });
    const entry = barriMap.get(b)!;
    entry.count++;
    const s = parseSentiment(r.sentiment);
    if (s !== null) entry.sentiments.push(s);
    const cat = r.clas1 ?? 'Altres';
    entry.categories.set(cat, (entry.categories.get(cat) ?? 0) + 1);
  }
  const byBarri = Array.from(barriMap.entries())
    .map(([b, e]) => ({
      barri: b,
      count: e.count,
      avg_sentiment: e.sentiments.length > 0
        ? e.sentiments.reduce((a, c) => a + c, 0) / e.sentiments.length
        : null,
      top_category: e.categories.size > 0
        ? Array.from(e.categories.entries()).sort((a, b) => b[1] - a[1])[0][0]
        : null,
    }))
    .sort((a, b) => b.count - a.count);

  // By canal
  const canalMap = new Map<string, number>();
  for (const r of rows) {
    const c = r.canal ?? 'Desconegut';
    canalMap.set(c, (canalMap.get(c) ?? 0) + 1);
  }
  const byCanal = Array.from(canalMap.entries())
    .map(([canal, count]) => ({ canal, count }))
    .sort((a, b) => b.count - a.count);

  // By clas1
  const clas1Map = new Map<string, number>();
  for (const r of rows) {
    const c = r.clas1 ?? 'Altres';
    clas1Map.set(c, (clas1Map.get(c) ?? 0) + 1);
  }
  const byClas1 = Array.from(clas1Map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Sentiment distribution (buckets of 1)
  const buckets: Record<string, number> = {};
  for (let i = 0; i <= 9; i++) {
    const label = `${i}–${i + 1}`;
    buckets[label] = 0;
  }
  for (const s of sentiments) {
    const bucket = Math.min(Math.floor(s), 9);
    const label = `${bucket}–${bucket + 1}`;
    buckets[label] = (buckets[label] ?? 0) + 1;
  }
  const sentimentDistribution = Object.entries(buckets).map(([range, count]) => ({ range, count }));

  // Heatmap: day-of-week × hour
  const heatmapMap = new Map<string, number>();
  for (const r of rows) {
    if (!r.data_inici) continue;
    const d = new Date(r.data_inici);
    const key = `${d.getDay()}_${d.getHours()}`;
    heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + 1);
  }
  const heatmap: { day: number; hour: number; count: number }[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmap.push({ day, hour, count: heatmapMap.get(`${day}_${hour}`) ?? 0 });
    }
  }

  const result: StatsResponse = {
    total: rows.length,
    avg_sentiment: avgSentiment,
    critical_count: criticalCount,
    by_barri: byBarri,
    by_canal: byCanal,
    by_clas1: byClas1,
    sentiment_distribution: sentimentDistribution,
    heatmap,
  };

  return NextResponse.json(result);
}
