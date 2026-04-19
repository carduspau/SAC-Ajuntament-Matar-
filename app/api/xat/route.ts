import { NextRequest, NextResponse } from 'next/server';
import { parseSentiment } from '@/lib/sentiment';
import type { ChatChartData } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

interface XatPayload {
  messages: { role: 'user' | 'assistant'; content: string }[];
  filters?: { from?: string; to?: string };
  apiKey?: string;
}

interface XatResult {
  content: string;
  chart?: ChatChartData;
}

const MONTHS_CA: Record<string, number> = {
  'gener': 0, 'febrer': 1, 'març': 2, 'abril': 3, 'maig': 4, 'juny': 5,
  'juliol': 6, 'agost': 7, 'setembre': 8, 'octubre': 9, 'novembre': 10, 'desembre': 11,
  'enero': 0, 'febrero': 1, 'marzo': 2, 'mayo': 4, 'junio': 5,
  'julio': 6, 'agosto': 7, 'septiembre': 8, 'noviembre': 10, 'diciembre': 11,
};

function parseDateRange(text: string, defaultFrom: Date, defaultTo: Date): { from: Date; to: Date } {
  const monthPat = Object.keys(MONTHS_CA).join('|');
  const mym = text.match(new RegExp(`(${monthPat})\\s+(?:de(?:l)?\\s+)?(\\d{4})`, 'i'));
  if (mym) {
    const month = MONTHS_CA[mym[1].toLowerCase()];
    const year = parseInt(mym[2]);
    return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0, 23, 59, 59, 999) };
  }
  const ym = text.match(/\bany\s+(20\d{2})\b/i);
  if (ym) {
    const year = parseInt(ym[1]);
    return { from: new Date(year, 0, 1), to: new Date(year, 11, 31, 23, 59, 59, 999) };
  }
  const ldm = text.match(/\b(?:darrers|últims)\s+(\d+)\s+dies\b/i);
  if (ldm) {
    const days = parseInt(ldm[1]);
    const to = new Date();
    return { from: new Date(to.getTime() - days * 86400000), to };
  }
  return { from: defaultFrom, to: defaultTo };
}

function detectChartType(text: string): string {
  const lower = text.toLowerCase();
  if (/dispersió|scatter|correlaci|relació.*entre|sentiment.*urgèn|urgèn.*sentiment/i.test(lower)) return 'scatter';
  if (/evolució|temporal|per dies|per mesos|tendència|temps/i.test(lower)) return 'timeline';
  if (/barri|barris|zona|zones/i.test(lower)) return 'barri';
  if (/canal|canals/i.test(lower)) return 'canal';
  if (/categoria|categories|tipus/i.test(lower)) return 'clas1';
  if (/sentiment|satisfacci|positiu|negatiu|distribució.*sentiment/i.test(lower)) return 'sentiment';
  if (/alerta|crític|urgent/i.test(lower)) return 'alerts';
  if (/departament/i.test(lower)) return 'departament';
  if (/intenció|intent/i.test(lower)) return 'intent';
  return 'barri';
}

async function runScatterQuery(sb: SupabaseClient, from: Date, to: Date): Promise<XatResult> {
  const { data, error } = await sb
    .from('sac_messages')
    .select('sentiment,followup_needed,barri,clas1,action_required')
    .gte('data_inici', from.toISOString())
    .lte('data_inici', to.toISOString())
    .limit(3000);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { sentiment: string | null; followup_needed: boolean | null; barri: string | null; clas1: string | null }[];
  if (rows.length === 0) return { content: 'No hi ha dades suficients per al gràfic de dispersió.' };

  // Aggregate by barri: avg_sentiment × urgency_rate
  const barriMap = new Map<string, { sentiments: number[]; urgent: number; total: number }>();
  for (const r of rows) {
    const b = r.barri ?? 'Desconegut';
    const s = parseSentiment(r.sentiment);
    if (s === null) continue;
    if (!barriMap.has(b)) barriMap.set(b, { sentiments: [], urgent: 0, total: 0 });
    const entry = barriMap.get(b)!;
    entry.sentiments.push(s);
    entry.total++;
    if (r.followup_needed) entry.urgent++;
  }

  const scatterData = Array.from(barriMap.entries())
    .filter(([, v]) => v.total >= 5)
    .map(([name, v]) => ({
      name,
      value: v.total,
      x: parseFloat((v.sentiments.reduce((a, b) => a + b, 0) / v.sentiments.length).toFixed(2)),
      y: parseFloat(((v.urgent / v.total) * 100).toFixed(1)),
    }))
    .sort((a, b) => a.x - b.x);

  const criticals = scatterData.filter(d => d.x < 4 && d.y > 30);
  const critText = criticals.length > 0
    ? `\n\nBarris **crítics** (baix sentiment + alta urgència): ${criticals.map(d => `**${d.name}**`).join(', ')}.`
    : '';

  return {
    content: `Gràfic de dispersió: **sentiment mitjà** (eix X, 0-10) vs **taxa d'urgència** (eix Y, %). Cada punt és un barri amb ≥5 missatges.${critText}\n\nTotal: **${rows.length}** missatges analitzats de **${scatterData.length}** barris.`,
    chart: {
      type: 'scatter',
      title: 'Sentiment vs Urgència per barri',
      data: scatterData,
      xLabel: 'Sentiment mitjà (0-10)',
      yLabel: 'Taxa urgència (%)',
    },
  };
}

async function runTimelineQuery(sb: SupabaseClient, from: Date, to: Date): Promise<XatResult> {
  const { data, error } = await sb
    .from('sac_messages')
    .select('data_inici,sentiment')
    .gte('data_inici', from.toISOString())
    .lte('data_inici', to.toISOString());

  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const dayMap = new Map<string, { count: number; sentSum: number; sentN: number }>();
  for (const r of rows) {
    if (!r.data_inici) continue;
    const day = r.data_inici.slice(0, 10);
    if (!dayMap.has(day)) dayMap.set(day, { count: 0, sentSum: 0, sentN: 0 });
    const entry = dayMap.get(day)!;
    entry.count++;
    const s = parseSentiment(r.sentiment);
    if (s !== null) { entry.sentSum += s; entry.sentN++; }
  }

  const chartData = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, v]) => ({
      name: name.slice(5),
      value: v.count,
      value2: v.sentN > 0 ? parseFloat((v.sentSum / v.sentN).toFixed(2)) : undefined,
    }));

  return {
    content: `Evolució temporal de **${rows.length}** missatges entre el **${from.toLocaleDateString('ca-ES')}** i el **${to.toLocaleDateString('ca-ES')}**.`,
    chart: { type: 'area', title: 'Evolució diària de missatges', data: chartData },
  };
}

async function runGroupQuery(sb: SupabaseClient, from: Date, to: Date, groupBy: 'barri' | 'canal' | 'clas1' | 'department' | 'intent'): Promise<XatResult> {
  const { data, error } = await sb
    .from('sac_messages')
    .select(`${groupBy},sentiment`)
    .gte('data_inici', from.toISOString())
    .lte('data_inici', to.toISOString());

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, string | null>[];

  const countMap = new Map<string, number>();
  for (const r of rows) {
    const key = r[groupBy] ?? 'Desconegut';
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  const chartData = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, value]) => ({ name, value }));

  const titles: Record<string, string> = {
    barri: 'Missatges per barri', canal: 'Distribució per canal',
    clas1: 'Missatges per categoria', department: 'Missatges per departament',
    intent: 'Distribució per intenció',
  };

  return {
    content: `**${rows.length}** missatges analitzats. Top ${groupBy}: **${chartData[0]?.name ?? 'N/D'}** (${chartData[0]?.value ?? 0} missatges).`,
    chart: { type: groupBy === 'canal' ? 'pie' : 'bar', title: titles[groupBy], data: chartData },
  };
}

async function runSentimentQuery(sb: SupabaseClient, from: Date, to: Date): Promise<XatResult> {
  const { data, error } = await sb
    .from('sac_messages')
    .select('sentiment')
    .gte('data_inici', from.toISOString())
    .lte('data_inici', to.toISOString());

  if (error) throw new Error(error.message);
  const sentiments = ((data ?? []) as { sentiment: string | null }[])
    .map(r => parseSentiment(r.sentiment))
    .filter((s): s is number => s !== null);

  if (sentiments.length === 0) return { content: 'No hi ha dades de sentiment.' };

  const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  const buckets: Record<string, number> = {};
  for (let i = 0; i <= 9; i++) buckets[`${i}–${i + 1}`] = 0;
  for (const s of sentiments) { const b = Math.min(Math.floor(s), 9); buckets[`${b}–${b + 1}`]++; }

  return {
    content: `Sentiment mitjà: **${avg.toFixed(2)}/10**\n• Crítics (< 3.5): **${sentiments.filter(s => s < 3.5).length}**\n• Positius (≥ 7): **${sentiments.filter(s => s >= 7).length}**`,
    chart: { type: 'bar', title: 'Distribució del sentiment', data: Object.entries(buckets).map(([name, value]) => ({ name, value })) },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: XatPayload = await req.json();
    const { messages, filters, apiKey: clientApiKey } = body;

    const defaultFrom = filters?.from ? new Date(filters.from) : new Date(Date.now() - 90 * 86400000);
    const defaultTo = filters?.to ? new Date(filters.to) : new Date();
    const lastMsg = messages[messages.length - 1]?.content ?? '';
    const { from, to } = parseDateRange(lastMsg, defaultFrom, defaultTo);
    const chartType = detectChartType(lastMsg);

    let supabase: SupabaseClient = null;
    try {
      const { createServerSupabase } = await import('@/lib/supabase-server');
      supabase = createServerSupabase();
    } catch { /* no DB */ }

    let result: XatResult = { content: 'No s\'ha pogut connectar a la base de dades.' };

    if (supabase) {
      if (chartType === 'scatter') result = await runScatterQuery(supabase, from, to);
      else if (chartType === 'timeline') result = await runTimelineQuery(supabase, from, to);
      else if (chartType === 'canal') result = await runGroupQuery(supabase, from, to, 'canal');
      else if (chartType === 'clas1') result = await runGroupQuery(supabase, from, to, 'clas1');
      else if (chartType === 'sentiment') result = await runSentimentQuery(supabase, from, to);
      else if (chartType === 'departament') result = await runGroupQuery(supabase, from, to, 'department');
      else if (chartType === 'intent') result = await runGroupQuery(supabase, from, to, 'intent');
      else result = await runGroupQuery(supabase, from, to, 'barri');
    }

    // Improve with OpenAI if available
    const apiKey = clientApiKey || process.env.OPENAI_API_KEY || '';
    if (apiKey && result.chart) {
      try {
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Ets un analista de dades del SAC de Mataró. Explica el gràfic de forma clara i útil en català (usa **negreta** per valors clau). Retorna JSON: {"content":"text"}. NO canviïs els números.' },
            { role: 'user', content: `Consulta: "${lastMsg}"\nResultat base: ${result.content}` },
          ],
          temperature: 0.3, max_tokens: 400,
          response_format: { type: 'json_object' },
        });
        const parsed = JSON.parse(completion.choices[0].message.content ?? '{}') as { content?: string };
        if (parsed.content) result.content = parsed.content;
      } catch { /* keep base content */ }
    }

    return NextResponse.json({ role: 'assistant', content: result.content, chart: result.chart ?? null });
  } catch (e: unknown) {
    return NextResponse.json({
      role: 'assistant',
      content: `Error: ${e instanceof Error ? e.message : 'Error desconegut'}.`,
      chart: null,
    });
  }
}
