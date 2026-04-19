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

interface QuerySpec {
  type: 'group_count' | 'group_sentiment' | 'timeline' | 'sentiment_dist' | 'scatter';
  groupBy?: 'barri' | 'canal' | 'clas1' | 'department' | 'intent';
  filterClas1?: string;
  filterBarri?: string;
  chartType?: 'bar' | 'pie' | 'area' | 'line' | 'scatter';
  title?: string;
}

// ─── Date parsing ──────────────────────────────────────────────────────────────

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

// ─── Heuristic planner ─────────────────────────────────────────────────────────

const CLS1_KEYWORDS: [string, string][] = [
  ['neteja', 'neteja'], ['residus', 'residus'], ['via pública', 'via'], ['via publica', 'via'],
  ['vies públiques', 'via'], ['llum', 'llum'], ['enllumenat', 'llum'], ['soroll', 'soroll'],
  ['trànsit', 'trànsit'], ['transit', 'trànsit'], ['urbanisme', 'urbanisme'], ['obres', 'obres'],
  ['parcs', 'parcs'], ['jardins', 'parcs'], ['transport', 'transport'], ['seguretat', 'seguretat'],
  ['clavegueram', 'clavegueram'], ['habitatge', 'habitatge'], ['medi ambient', 'medi'],
];

function detectClas1(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [kw, val] of CLS1_KEYWORDS) {
    if (lower.includes(kw)) return val;
  }
  return undefined;
}

function planQueriesFallback(text: string): QuerySpec[] {
  const lower = text.toLowerCase();
  const filterClas1 = detectClas1(text);
  const hasBarri = /barri|barris|zona|zones/i.test(lower);

  if (/sentiment.*urgèn|urgèn.*sentiment|dispersió|scatter/i.test(lower)) {
    return [{ type: 'scatter', title: 'Sentiment vs Urgència per barri' }];
  }
  if (/evolució|evolutiu|temporal|per dies|per mesos|tendència|temps/i.test(lower)) {
    return [{ type: 'timeline', filterClas1, title: filterClas1 ? `Evolució temporal — ${filterClas1}` : 'Evolució temporal de missatges' }];
  }
  if (/canal|canals|telèfon|web|presencial/i.test(lower)) {
    return [{ type: 'group_count', groupBy: 'canal', chartType: 'pie', title: 'Distribució per canal' }];
  }
  if (/departament/i.test(lower)) {
    return [{ type: 'group_count', groupBy: 'department', chartType: 'bar', title: 'Missatges per departament' }];
  }
  if (/intenció|intent/i.test(lower)) {
    return [{ type: 'group_count', groupBy: 'intent', chartType: 'bar', title: 'Distribució per intenció' }];
  }
  if (/categoria|categories|tipus/i.test(lower) && !hasBarri && !filterClas1) {
    return [{ type: 'group_count', groupBy: 'clas1', chartType: 'bar', title: 'Missatges per categoria' }];
  }
  if (/sentiment|satisfacci|positiu|negatiu/i.test(lower) && !hasBarri && !filterClas1) {
    return [{ type: 'sentiment_dist', title: 'Distribució del sentiment' }];
  }
  if (hasBarri || filterClas1) {
    const specs: QuerySpec[] = [{
      type: 'group_count', groupBy: 'barri', filterClas1, chartType: 'bar',
      title: filterClas1 ? `Incidències de ${filterClas1} per barri` : 'Missatges per barri',
    }];
    if (filterClas1) {
      specs.push({
        type: 'group_sentiment', groupBy: 'barri', filterClas1, chartType: 'bar',
        title: `Sentiment de ${filterClas1} per barri`,
      });
    }
    return specs;
  }
  return [{ type: 'group_count', groupBy: 'barri', chartType: 'bar', title: 'Missatges per barri' }];
}

// ─── OpenAI planner ────────────────────────────────────────────────────────────

async function planQueriesWithAI(apiKey: string, question: string): Promise<QuerySpec[]> {
  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey });
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Ets un analista de dades del SAC de Mataró. Planifica les consultes per respondre la pregunta.

TIPUS:
- "group_count": Compta missatges agrupats. groupBy: barri|canal|clas1|department|intent. chartType: bar|pie
- "group_sentiment": Sentiment mitjà (0-10) per grup — revela satisfacció. groupBy: barri|clas1|department. chartType: bar
- "timeline": Evolució temporal diària. chartType: area|line
- "sentiment_dist": Histograma 0-10. chartType: bar
- "scatter": Dispersió sentiment vs urgència per barri. ÚNICAMENT si es demana explícitament correlació sentiment-urgència.

FILTRES: filterClas1 (neteja|residus|via|llum|soroll|trànsit|urbanisme|obres|parcs|transport|seguretat|habitatge), filterBarri

EXEMPLES:
- "barris i neteja / barris bruts?" → [{type:group_count,groupBy:barri,filterClas1:neteja},{type:group_sentiment,groupBy:barri,filterClas1:neteja}]
- "quins barris estan contents?" → [{type:group_sentiment,groupBy:barri}]
- "resum" → [{type:group_count,groupBy:barri},{type:group_count,groupBy:clas1},{type:sentiment_dist}]
- "canals" → [{type:group_count,groupBy:canal,chartType:pie}]

Retorna JSON: {"queries":[...]} amb 1-3 elements.`,
      },
      { role: 'user', content: question },
    ],
    temperature: 0.1,
    max_tokens: 400,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(resp.choices[0].message.content ?? '{}') as { queries?: QuerySpec[] };
  return parsed.queries ?? [];
}

// ─── Query executors ───────────────────────────────────────────────────────────

async function execGroupCount(sb: SupabaseClient, from: Date, to: Date, spec: QuerySpec): Promise<{ chart: ChatChartData | null; summary: string }> {
  const groupBy = spec.groupBy ?? 'barri';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from('sac_messages').select(groupBy)
    .gte('data_inici', from.toISOString()).lte('data_inici', to.toISOString());
  if (spec.filterClas1) q = q.ilike('clas1', `%${spec.filterClas1}%`);
  if (spec.filterBarri) q = q.ilike('barri', `%${spec.filterBarri}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, string | null>[];

  const countMap = new Map<string, number>();
  for (const r of rows) {
    const key = r[groupBy] ?? 'Desconegut';
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }
  const chartData = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([name, value]) => ({ name, value }));
  const type = spec.chartType === 'pie' ? 'pie' as const : 'bar' as const;
  const top = chartData[0];
  return {
    chart: chartData.length > 0 ? { type, title: spec.title ?? 'Resultats', data: chartData } : null,
    summary: `**${rows.length}** missatges${spec.filterClas1 ? ` de "${spec.filterClas1}"` : ''}. Principal: **${top?.name ?? 'N/D'}** (${top?.value ?? 0}).`,
  };
}

async function execGroupSentiment(sb: SupabaseClient, from: Date, to: Date, spec: QuerySpec): Promise<{ chart: ChatChartData | null; summary: string }> {
  const groupBy = spec.groupBy ?? 'barri';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from('sac_messages').select(`${groupBy},sentiment`)
    .gte('data_inici', from.toISOString()).lte('data_inici', to.toISOString());
  if (spec.filterClas1) q = q.ilike('clas1', `%${spec.filterClas1}%`);
  if (spec.filterBarri) q = q.ilike('barri', `%${spec.filterBarri}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, string | null>[];

  const groupMap = new Map<string, number[]>();
  for (const r of rows) {
    const key = r[groupBy] ?? 'Desconegut';
    const s = parseSentiment(r.sentiment);
    if (s === null) continue;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(s);
  }
  const chartData = Array.from(groupMap.entries())
    .filter(([, vals]) => vals.length >= 3)
    .map(([name, vals]) => ({
      name,
      value: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)),
    }))
    .sort((a, b) => a.value - b.value)  // worst sentiment first
    .slice(0, 12);

  const worst = chartData[0];
  const best = chartData[chartData.length - 1];
  return {
    chart: chartData.length > 0 ? {
      type: 'bar', title: spec.title ?? `Sentiment per ${groupBy}`,
      data: chartData, unit: '/10',
    } : null,
    summary: chartData.length > 0
      ? `Sentiment${spec.filterClas1 ? ` de "${spec.filterClas1}"` : ''}: pitjor **${worst?.name}** (${worst?.value}/10), millor **${best?.name}** (${best?.value}/10).`
      : 'Sense dades de sentiment suficients.',
  };
}

async function execTimeline(sb: SupabaseClient, from: Date, to: Date, spec: QuerySpec): Promise<{ chart: ChatChartData | null; summary: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from('sac_messages').select('data_inici')
    .gte('data_inici', from.toISOString()).lte('data_inici', to.toISOString());
  if (spec.filterClas1) q = q.ilike('clas1', `%${spec.filterClas1}%`);
  if (spec.filterBarri) q = q.ilike('barri', `%${spec.filterBarri}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const dayMap = new Map<string, number>();
  for (const r of rows) {
    if (!r.data_inici) continue;
    const day = r.data_inici.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const chartData = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name: name.slice(5), value }));
  return {
    chart: chartData.length > 0 ? { type: 'area', title: spec.title ?? 'Evolució temporal', data: chartData } : null,
    summary: `Evolució de **${rows.length}** missatges entre ${from.toLocaleDateString('ca-ES')} i ${to.toLocaleDateString('ca-ES')}.`,
  };
}

async function execSentimentDist(sb: SupabaseClient, from: Date, to: Date, spec: QuerySpec): Promise<{ chart: ChatChartData | null; summary: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from('sac_messages').select('sentiment')
    .gte('data_inici', from.toISOString()).lte('data_inici', to.toISOString());
  if (spec.filterClas1) q = q.ilike('clas1', `%${spec.filterClas1}%`);
  if (spec.filterBarri) q = q.ilike('barri', `%${spec.filterBarri}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const sentiments = ((data ?? []) as { sentiment: string | null }[])
    .map(r => parseSentiment(r.sentiment)).filter((s): s is number => s !== null);
  if (sentiments.length === 0) return { chart: null, summary: 'No hi ha dades de sentiment.' };

  const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  const buckets: Record<string, number> = {};
  for (let i = 0; i <= 9; i++) buckets[`${i}–${i + 1}`] = 0;
  for (const s of sentiments) { const b = Math.min(Math.floor(s), 9); buckets[`${b}–${b + 1}`]++; }
  return {
    chart: { type: 'bar', title: spec.title ?? 'Distribució del sentiment', data: Object.entries(buckets).map(([name, value]) => ({ name, value })) },
    summary: `Sentiment mitjà: **${avg.toFixed(2)}/10** · Crítics (<3.5): **${sentiments.filter(s => s < 3.5).length}** · Positius (≥7): **${sentiments.filter(s => s >= 7).length}**`,
  };
}

async function execScatter(sb: SupabaseClient, from: Date, to: Date): Promise<{ chart: ChatChartData | null; summary: string }> {
  const { data, error } = await sb.from('sac_messages')
    .select('sentiment,followup_needed,barri')
    .gte('data_inici', from.toISOString()).lte('data_inici', to.toISOString())
    .limit(3000);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { sentiment: string | null; followup_needed: boolean | null; barri: string | null }[];

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
      name, value: v.total,
      x: parseFloat((v.sentiments.reduce((a, b) => a + b, 0) / v.sentiments.length).toFixed(2)),
      y: parseFloat(((v.urgent / v.total) * 100).toFixed(1)),
    }))
    .sort((a, b) => a.x - b.x);

  const criticals = scatterData.filter(d => d.x < 4 && d.y > 30);
  return {
    chart: { type: 'scatter', title: 'Sentiment vs Urgència per barri', data: scatterData, xLabel: 'Sentiment mitjà (0-10)', yLabel: 'Taxa urgència (%)' },
    summary: `Dispersió de **${scatterData.length}** barris (${rows.length} missatges)${criticals.length ? `. Barris crítics: ${criticals.map(d => `**${d.name}**`).join(', ')}` : ''}.`,
  };
}

// ─── Main POST ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: XatPayload = await req.json();
    const { messages, filters, apiKey: clientApiKey } = body;

    const defaultFrom = filters?.from ? new Date(filters.from) : new Date(Date.now() - 90 * 86400000);
    const defaultTo = filters?.to ? new Date(filters.to) : new Date();
    const lastMsg = messages[messages.length - 1]?.content ?? '';
    const { from, to } = parseDateRange(lastMsg, defaultFrom, defaultTo);

    let supabase: SupabaseClient = null;
    try {
      const { createServerSupabase } = await import('@/lib/supabase-server');
      supabase = createServerSupabase();
    } catch { /* no DB */ }

    if (!supabase) {
      return NextResponse.json({ role: 'assistant', content: 'No s\'ha pogut connectar a la base de dades.', charts: null, chart: null });
    }

    const apiKey = clientApiKey || process.env.OPENAI_API_KEY || '';

    // Plan queries (AI if available, heuristic fallback)
    let specs: QuerySpec[] = planQueriesFallback(lastMsg);
    if (apiKey) {
      try {
        const aiSpecs = await planQueriesWithAI(apiKey, lastMsg);
        if (aiSpecs.length > 0) specs = aiSpecs;
      } catch { /* keep heuristic */ }
    }

    // Execute all specs in parallel (max 3)
    const execResults = await Promise.allSettled(
      specs.slice(0, 3).map(spec => {
        if (spec.type === 'scatter') return execScatter(supabase, from, to);
        if (spec.type === 'timeline') return execTimeline(supabase, from, to, spec);
        if (spec.type === 'sentiment_dist') return execSentimentDist(supabase, from, to, spec);
        if (spec.type === 'group_sentiment') return execGroupSentiment(supabase, from, to, spec);
        return execGroupCount(supabase, from, to, spec);
      })
    );

    const charts: ChatChartData[] = [];
    const summaries: string[] = [];
    for (const r of execResults) {
      if (r.status === 'fulfilled') {
        if (r.value.chart) charts.push(r.value.chart);
        summaries.push(r.value.summary);
      }
    }

    // Improve text with OpenAI
    let content = summaries.join('\n\n');
    if (apiKey && charts.length > 0) {
      try {
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Ets un analista del SAC de Mataró. Explica els resultats en català de forma clara (usa **negreta** per valors clau). Màxim 3 frases. Retorna JSON: {"content":"text"}. NO canviïs els números.' },
            { role: 'user', content: `Consulta: "${lastMsg}"\nDades: ${summaries.join(' | ')}` },
          ],
          temperature: 0.3, max_tokens: 300,
          response_format: { type: 'json_object' },
        });
        const parsed = JSON.parse(completion.choices[0].message.content ?? '{}') as { content?: string };
        if (parsed.content) content = parsed.content;
      } catch { /* keep template */ }
    }

    return NextResponse.json({
      role: 'assistant',
      content,
      charts: charts.length > 0 ? charts : null,
      chart: charts[0] ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json({
      role: 'assistant',
      content: `Error: ${e instanceof Error ? e.message : 'Error desconegut'}.`,
      charts: null,
      chart: null,
    });
  }
}
