import { parseSentiment } from '@/lib/sentiment';
import type { StatsResponse, TimelineBucket, TimelineGranularity } from '@/types';
import { format, parseISO } from 'date-fns';

type RawMessage = {
  id?: number;
  sentiment?: string | null;
  barri?: string | null;
  canal?: string | null;
  clas1?: string | null;
  data_inici?: string | null;
};

export function computeStats(rows: RawMessage[]): StatsResponse {
  const sentiments = rows.map(r => parseSentiment(r.sentiment ?? null)).filter(s => s !== null) as number[];
  const avgSentiment = sentiments.length > 0
    ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : null;
  const criticalCount = sentiments.filter(s => s < 3).length;

  const barriMap = new Map<string, { count: number; sentiments: number[]; categories: Map<string, number> }>();
  const canalMap = new Map<string, number>();
  const clas1Map = new Map<string, number>();
  const heatmapMap = new Map<string, number>();

  for (const r of rows) {
    const b = r.barri ?? 'Desconegut';
    if (!barriMap.has(b)) barriMap.set(b, { count: 0, sentiments: [], categories: new Map() });
    const entry = barriMap.get(b)!;
    entry.count++;
    const s = parseSentiment(r.sentiment ?? null);
    if (s !== null) entry.sentiments.push(s);
    const cat = r.clas1 ?? 'Altres';
    entry.categories.set(cat, (entry.categories.get(cat) ?? 0) + 1);

    const c = r.canal ?? 'Desconegut';
    canalMap.set(c, (canalMap.get(c) ?? 0) + 1);

    const cl = r.clas1 ?? 'Altres';
    clas1Map.set(cl, (clas1Map.get(cl) ?? 0) + 1);

    if (r.data_inici) {
      const d = new Date(r.data_inici);
      const key = `${d.getDay()}_${d.getHours()}`;
      heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + 1);
    }
  }

  const byBarri = Array.from(barriMap.entries())
    .map(([barri, e]) => ({
      barri,
      count: e.count,
      avg_sentiment: e.sentiments.length > 0
        ? e.sentiments.reduce((a, c) => a + c, 0) / e.sentiments.length : null,
      top_category: e.categories.size > 0
        ? Array.from(e.categories.entries()).sort((a, b) => b[1] - a[1])[0][0] : null,
    }))
    .sort((a, b) => b.count - a.count);

  const byCanal = Array.from(canalMap.entries())
    .map(([canal, count]) => ({ canal, count }))
    .sort((a, b) => b.count - a.count);

  const byClas1 = Array.from(clas1Map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const buckets: Record<string, number> = {};
  for (let i = 0; i <= 9; i++) buckets[`${i}–${i + 1}`] = 0;
  for (const s of sentiments) {
    const bucket = Math.min(Math.floor(s), 9);
    buckets[`${bucket}–${bucket + 1}`] = (buckets[`${bucket}–${bucket + 1}`] ?? 0) + 1;
  }
  const sentimentDistribution = Object.entries(buckets).map(([range, count]) => ({ range, count }));

  const heatmap: { day: number; hour: number; count: number }[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmap.push({ day, hour, count: heatmapMap.get(`${day}_${hour}`) ?? 0 });
    }
  }

  return { total: rows.length, avg_sentiment: avgSentiment, critical_count: criticalCount, by_barri: byBarri, by_canal: byCanal, by_clas1: byClas1, sentiment_distribution: sentimentDistribution, heatmap };
}

export function bucketKey(dateStr: string, granularity: TimelineGranularity): string {
  try {
    const d = new Date(dateStr);
    switch (granularity) {
      case 'hour': return format(d, "yyyy-MM-dd'T'HH:00");
      case 'day': return format(d, 'yyyy-MM-dd');
      case 'week': {
        const ws = new Date(d);
        ws.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return format(ws, 'yyyy-MM-dd');
      }
      case 'month': return format(d, 'yyyy-MM');
    }
  } catch { return dateStr; }
}

export function computeTimeline(rows: RawMessage[], granularity: TimelineGranularity): TimelineBucket[] {
  const buckets = new Map<string, { count: number; sentiments: number[] }>();
  for (const row of rows) {
    if (!row.data_inici) continue;
    const key = bucketKey(row.data_inici, granularity);
    if (!buckets.has(key)) buckets.set(key, { count: 0, sentiments: [] });
    const b = buckets.get(key)!;
    b.count++;
    const s = parseSentiment(row.sentiment ?? null);
    if (s !== null) b.sentiments.push(s);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, { count, sentiments }]) => ({
      bucket,
      count,
      avg_sentiment: sentiments.length > 0
        ? Math.round((sentiments.reduce((a, b) => a + b, 0) / sentiments.length) * 10) / 10 : null,
    }));
}
