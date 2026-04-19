import { NextRequest, NextResponse } from 'next/server';
import { parseSentiment } from '@/lib/sentiment';
import type { ChatChartData, ChatAction } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatStats {
  total: number;
  avgSentiment: number | null;
  criticalCount: number;
  topBarri: string | null;
  topCanal: string | null;
  topCategory: string | null;
  byBarri: Record<string, number>;
  byCanal: Record<string, number>;
  byClas1?: Record<string, number>;
}

interface ChatPayload {
  messages: { role: 'user' | 'assistant'; content: string }[];
  filters?: { from?: string; to?: string };
  apiKey?: string;
  stats?: ChatStats;
}

interface QueryResult {
  content: string;
  chart?: ChatChartData;
  action?: ChatAction;
  rowCount: number;
}

const EMPTY_STATS: ChatStats = {
  total: 0, avgSentiment: null, criticalCount: 0,
  topBarri: null, topCanal: null, topCategory: null,
  byBarri: {}, byCanal: {}, byClas1: {},
};

// ─── Date parsing ─────────────────────────────────────────────────────────────

const MONTHS_CA: Record<string, number> = {
  'gener': 0, 'febrer': 1, 'març': 2, 'abril': 3, 'maig': 4, 'juny': 5,
  'juliol': 6, 'agost': 7, 'setembre': 8, 'octubre': 9, 'novembre': 10, 'desembre': 11,
  'enero': 0, 'febrero': 1, 'marzo': 2, 'mayo': 4, 'junio': 5,
  'julio': 6, 'agosto': 7, 'septiembre': 8, 'noviembre': 10, 'diciembre': 11,
};

function parseDateRange(text: string, defaultFrom: Date, defaultTo: Date): { from: Date; to: Date; explicit: boolean } {
  const monthPat = Object.keys(MONTHS_CA).join('|');
  const mym = text.match(new RegExp(`(${monthPat})\\s+(?:de(?:l)?\\s+)?(\\d{4})`, 'i'));
  if (mym) {
    const month = MONTHS_CA[mym[1].toLowerCase()];
    const year = parseInt(mym[2]);
    return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0, 23, 59, 59, 999), explicit: true };
  }
  const ym = text.match(/\bany\s+(20\d{2})\b/i);
  if (ym) {
    const year = parseInt(ym[1]);
    return { from: new Date(year, 0, 1), to: new Date(year, 11, 31, 23, 59, 59, 999), explicit: true };
  }
  const ldm = text.match(/\b(?:darrers|últims|ultimos)\s+(\d+)\s+dies\b/i);
  if (ldm) {
    const days = parseInt(ldm[1]);
    const to = new Date();
    return { from: new Date(to.getTime() - days * 86400000), to, explicit: true };
  }
  return { from: defaultFrom, to: defaultTo, explicit: false };
}

// ─── Filter extraction ────────────────────────────────────────────────────────

function extractBarri(text: string): string | null {
  const m = text.match(/barri\s+(?:de(?:l|ls|s)?\s+(?:la\s+|el\s+|les\s+|els\s+)?)?([A-ZÁÀÉÈÍÏÓÒÚÜÇÑ][a-záàéèíïóòúüçñA-ZÁÀÉÈÍÏÓÒÚÜÇÑ\-']+)/i);
  if (m) return m[1].trim();
  const known = ['Cerdanyola', 'Eixample', 'Palau', 'Llàntia', 'Cirera', 'Rocafonda',
    'Santes', 'Molinet', 'Vista Alegre', 'Peramàs', 'Sorrall', 'Havana', 'Boet'];
  const lower = text.toLowerCase();
  for (const b of known) if (lower.includes(b.toLowerCase())) return b;
  return null;
}

function extractClas1Keyword(text: string): string | null {
  const lower = text.toLowerCase();
  const patterns: [string, string][] = [
    ['neteja', 'neteja'], ['residus', 'residus'], ['via pública', 'via'],
    ['via publica', 'via'], ['vies públiques', 'via'], ['llicència', 'llicènc'],
    ['llicencia', 'llicènc'], ['llum', 'llum'], ['enllumenat', 'llum'],
    ['soroll', 'soroll'], ['trànsit', 'trànsit'], ['transit', 'trànsit'],
    ['urbanisme', 'urbanisme'], ['obres', 'obres'], ['parcs', 'parc'],
    ['jardins', 'parc'], ['transport', 'transport'], ['seguretat', 'seguretat'],
    ['clavegueram', 'clavegueram'], ['habitatge', 'habitatge'], ['medi ambient', 'medi'],
  ];
  for (const [kw, search] of patterns) if (lower.includes(kw)) return search;
  return null;
}

function detectQueryType(text: string): 'timeline' | 'barri' | 'canal' | 'clas1' | 'sentiment' | 'alerts' | 'navigate' | 'general' {
  const lower = text.toLowerCase();
  if (/evolució|evolutiu|temporal|per dies|per mesos|gràfic.*temps|tendència|trend/i.test(lower)) return 'timeline';
  if (/barri|barris|zona|zones/i.test(lower)) return 'barri';
  if (/canal|canals|telèfon|web|presencial|correu/i.test(lower)) return 'canal';
  if (/categoria|categories|tipus|classe/i.test(lower)) return 'clas1';
  if (/sentiment|satisfacci|valoració|positiu|negatiu/i.test(lower)) return 'sentiment';
  if (/alerta|alertes|crític|urgent|prioritari/i.test(lower)) return 'alerts';
  if (/porta'm|ves a|navega|anar a/i.test(lower)) return 'navigate';
  return 'general';
}

function detectNavigationTarget(text: string): string {
  if (/alertes|crítiques/i.test(text)) return '/alertes';
  if (/estadíst/i.test(text)) return '/estadistiques';
  if (/tendènci/i.test(text)) return '/tendencies';
  if (/mapa/i.test(text)) return '/mapa';
  if (/barris\b/i.test(text)) return '/barris';
  if (/missatge/i.test(text)) return '/missatges';
  if (/informe/i.test(text)) return '/informes';
  return '/';
}

// ─── Mock fallback (when Supabase is unavailable) ─────────────────────────────

function buildMockResult(queryType: string, lastMsg: string, stats: ChatStats): QueryResult {
  if (queryType === 'barri') {
    const data = Object.entries(stats.byBarri).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
    return { content: `El barri principal és **${stats.topBarri ?? 'N/D'}** amb **${stats.total}** missatges totals.`, chart: data.length ? { type: 'bar', title: 'Missatges per barri', data } : undefined, rowCount: data.length };
  }
  if (queryType === 'canal') {
    const data = Object.entries(stats.byCanal).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
    return { content: `Canal principal: **${stats.topCanal ?? 'N/D'}**.`, chart: data.length ? { type: 'pie', title: 'Distribució per canal', data } : undefined, rowCount: data.length };
  }
  if (queryType === 'clas1') {
    const data = Object.entries(stats.byClas1 ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
    return { content: `Categoria principal: **${stats.topCategory ?? 'N/D'}**.`, chart: data.length ? { type: 'bar', title: 'Missatges per categoria', data } : undefined, rowCount: data.length };
  }
  if (queryType === 'sentiment') {
    const avg = stats.avgSentiment;
    return { content: `Sentiment mitjà: **${avg !== null ? avg.toFixed(1) : 'N/D'}/10**. Missatges crítics: **${stats.criticalCount}**.`, rowCount: stats.total };
  }
  if (queryType === 'alerts') {
    return { content: `Hi ha **${stats.criticalCount}** missatges crítics.`, action: { type: 'navigate', href: '/alertes', label: 'Veure alertes crítiques' }, rowCount: stats.criticalCount };
  }
  if (queryType === 'navigate') {
    const href = detectNavigationTarget(lastMsg);
    return { content: `Et porto a **${href}**.`, action: { type: 'navigate', href, label: `Anar a ${href}` }, rowCount: 0 };
  }
  const data = Object.entries(stats.byBarri).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  return {
    content: `**Resum:** ${stats.total} missatges · sentiment ${stats.avgSentiment?.toFixed(1) ?? 'N/D'}/10 · ${stats.criticalCount} crítics.\n\n_Nota: connexió a BD no disponible, usant dades del dashboard._`,
    chart: data.length ? { type: 'bar', title: 'Top barris', data } : undefined,
    rowCount: stats.total,
  };
}

// ─── Real Supabase queries ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

async function runTimelineQuery(sb: SupabaseClient, from: Date, to: Date, barri: string | null, clas1: string | null): Promise<QueryResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from('sac_messages').select('data_inici,sentiment')
    .gte('data_inici', from.toISOString()).lte('data_inici', to.toISOString());
  if (barri) q = q.ilike('barri', `%${barri}%`);
  if (clas1) q = q.ilike('clas1', `%${clas1}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  if (rows.length === 0) {
    const filters = [barri && `barri "${barri}"`, clas1 && `categoria "${clas1}"`].filter(Boolean).join(' i ');
    return { content: `No s'han trobat dades${filters ? ` per a ${filters}` : ''} entre ${from.toLocaleDateString('ca-ES')} i ${to.toLocaleDateString('ca-ES')}.`, rowCount: 0 };
  }

  const dayMap = new Map<string, number>();
  for (const r of rows) {
    if (!r.data_inici) continue;
    const day = r.data_inici.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const chartData = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name: name.slice(5), value }));
  const titleParts = ['Evolució diària', clas1, barri].filter(Boolean).join(' · ');
  const filterText = [barri && `**${barri}**`, clas1 && `**${clas1}**`].filter(Boolean).join(', ');
  const params = new URLSearchParams();
  if (barri) params.set('barri', barri);
  if (clas1) params.set('clas1', clas1);

  return {
    content: `He trobat **${rows.length}** missatges${filterText ? ` de ${filterText}` : ''} entre el **${from.toLocaleDateString('ca-ES')}** i el **${to.toLocaleDateString('ca-ES')}**.`,
    chart: chartData.length > 0 ? { type: 'area', title: titleParts, data: chartData } : undefined,
    action: { type: 'navigate', label: `Veure els ${rows.length} missatges`, href: `/missatges${params.toString() ? '?' + params.toString() : ''}` },
    rowCount: rows.length,
  };
}

async function runStatsQuery(sb: SupabaseClient, from: Date, to: Date, barri: string | null, clas1: string | null, groupBy: 'barri' | 'canal' | 'clas1'): Promise<QueryResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from('sac_messages').select('barri,canal,clas1,sentiment')
    .gte('data_inici', from.toISOString()).lte('data_inici', to.toISOString());
  if (barri) q = q.ilike('barri', `%${barri}%`);
  if (clas1) q = q.ilike('clas1', `%${clas1}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length === 0) return { content: 'No s\'han trobat dades per als filtres especificats.', rowCount: 0 };

  const countMap = new Map<string, number>();
  for (const r of rows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const key = ((r as any)[groupBy]) ?? 'Desconegut';
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }
  const chartData = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  const sentiments = rows.map((r: { sentiment: string | null }) => parseSentiment(r.sentiment)).filter((s): s is number => s !== null);
  const avg = sentiments.length > 0 ? (sentiments.reduce((a, b) => a + b, 0) / sentiments.length).toFixed(1) : 'N/D';
  const top = chartData[0];
  const titles: Record<string, string> = { barri: 'Missatges per barri', canal: 'Distribució per canal', clas1: 'Missatges per categoria' };
  const labels: Record<string, string> = { barri: 'barri', canal: 'canal', clas1: 'categoria' };

  return {
    content: `**${rows.length}** missatges analitzats.${top ? `\nEl ${labels[groupBy]} principal és **"${top.name}"** amb **${top.value}** missatges.` : ''}\nSentiment mitjà: **${avg}/10**`,
    chart: { type: groupBy === 'canal' ? 'pie' : 'bar', title: titles[groupBy], data: chartData },
    rowCount: rows.length,
  };
}

async function runSentimentQuery(sb: SupabaseClient, from: Date, to: Date, barri: string | null, clas1: string | null): Promise<QueryResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from('sac_messages').select('sentiment')
    .gte('data_inici', from.toISOString()).lte('data_inici', to.toISOString());
  if (barri) q = q.ilike('barri', `%${barri}%`);
  if (clas1) q = q.ilike('clas1', `%${clas1}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const sentiments = (data ?? []).map((r: { sentiment: string | null }) => parseSentiment(r.sentiment)).filter((s): s is number => s !== null);
  if (sentiments.length === 0) return { content: 'No hi ha dades de sentiment per al filtre seleccionat.', rowCount: 0 };

  const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  const critical = sentiments.filter(s => s < 3.5).length;
  const positive = sentiments.filter(s => s >= 7).length;
  const label = avg >= 7 ? 'positiu' : avg >= 4 ? 'neutre' : 'negatiu';
  const buckets: Record<string, number> = {};
  for (let i = 0; i <= 9; i++) buckets[`${i}-${i + 1}`] = 0;
  for (const s of sentiments) { const b = Math.min(Math.floor(s), 9); buckets[`${b}-${b + 1}`]++; }
  const chartData = Object.entries(buckets).map(([name, value]) => ({ name, value }));

  return {
    content: `Sentiment ${barri ? `a **${barri}**` : ''}: **${avg.toFixed(1)}/10** (${label})\n• Crítics (< 3.5): **${critical}** (${Math.round(critical / sentiments.length * 100)}%)\n• Positius (≥ 7): **${positive}** (${Math.round(positive / sentiments.length * 100)}%)\n• Total: **${sentiments.length}**`,
    chart: { type: 'bar', title: 'Distribució del sentiment', data: chartData },
    rowCount: sentiments.length,
  };
}

async function runAlertsQuery(sb: SupabaseClient, from: Date, to: Date): Promise<QueryResult> {
  const { data, error } = await sb.from('sac_messages').select('sentiment')
    .gte('data_inici', from.toISOString()).lte('data_inici', to.toISOString());
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const critical = rows.filter((r: { sentiment: string | null }) => { const s = parseSentiment(r.sentiment); return s !== null && s < 3.5; }).length;
  return {
    content: `Hi ha **${critical}** missatges crítics (sentiment < 3.5) de **${rows.length}** totals (${rows.length > 0 ? Math.round(critical / rows.length * 100) : 0}%).`,
    action: { type: 'navigate', href: '/alertes', label: 'Veure alertes crítiques' },
    rowCount: critical,
  };
}

// ─── Main POST handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Outermost try/catch: ALWAYS returns JSON, never lets Next.js return HTML 500
  try {
    const body: ChatPayload = await req.json();
    const { messages, filters, apiKey: clientApiKey, stats: clientStats } = body;

    const defaultFrom = filters?.from ? new Date(filters.from) : new Date(Date.now() - 30 * 86400000);
    const defaultTo = filters?.to ? new Date(filters.to) : new Date();
    const lastMsg = messages[messages.length - 1]?.content ?? '';

    const { from, to, explicit: explicitDate } = parseDateRange(lastMsg, defaultFrom, defaultTo);
    const barri = extractBarri(lastMsg);
    const clas1Keyword = extractClas1Keyword(lastMsg);
    const queryType = detectQueryType(lastMsg);
    const stats = clientStats ?? EMPTY_STATS;

    // Try to initialise Supabase (might fail if env vars are missing)
    let supabase: SupabaseClient = null;
    try {
      const { createServerSupabase } = await import('@/lib/supabase-server');
      supabase = createServerSupabase();
    } catch {
      // Will use mock fallback below
    }

    let result: QueryResult;

    if (!supabase) {
      result = buildMockResult(queryType, lastMsg, stats);
    } else if (queryType === 'navigate') {
      const href = detectNavigationTarget(lastMsg);
      const names: Record<string, string> = { '/alertes': 'Alertes', '/estadistiques': 'Estadístiques', '/tendencies': 'Tendències', '/mapa': 'Mapa', '/barris': 'Barris', '/missatges': 'Missatges', '/informes': 'Informes', '/': 'Inici' };
      result = { content: `D'acord! Et porto a **${names[href] ?? href}**.`, action: { type: 'navigate', href, label: `Anar a ${names[href] ?? href}` }, rowCount: 0 };
    } else if (queryType === 'timeline') {
      result = await runTimelineQuery(supabase, from, to, barri, clas1Keyword);
    } else if (queryType === 'canal') {
      result = await runStatsQuery(supabase, from, to, barri, clas1Keyword, 'canal');
    } else if (queryType === 'clas1') {
      result = await runStatsQuery(supabase, from, to, barri, clas1Keyword, 'clas1');
    } else if (queryType === 'sentiment') {
      result = await runSentimentQuery(supabase, from, to, barri, clas1Keyword);
    } else if (queryType === 'alerts') {
      result = await runAlertsQuery(supabase, from, to);
    } else {
      // 'barri' or 'general'
      result = await runStatsQuery(supabase, from, to, barri, clas1Keyword, 'barri');
    }

    // Optional: use OpenAI to improve text if key is present and we got data
    const apiKey = clientApiKey || process.env.OPENAI_API_KEY || '';
    if (apiKey && result.rowCount > 0) {
      try {
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Ets un assistent del SAC de Mataró. Millora el text en català (usa **negreta**). Retorna JSON: {"content":"text"}. NO canviïs els números.' },
            { role: 'user', content: `Consulta: "${lastMsg}"\nResultat: ${result.content}` },
          ],
          temperature: 0.2, max_tokens: 300,
          response_format: { type: 'json_object' },
        });
        const parsed = JSON.parse(completion.choices[0].message.content ?? '{}') as { content?: string };
        if (parsed.content) result.content = parsed.content;
      } catch {
        // Keep template content if OpenAI fails
      }
    }

    // If the user specified explicit dates in the message, offer to apply them to the dashboard
    if (explicitDate && !result.action) {
      result.action = {
        type: 'setFilter',
        label: `Aplicar ${from.toLocaleDateString('ca-ES')} – ${to.toLocaleDateString('ca-ES')} al dashboard`,
        dateFrom: from.toISOString(),
        dateTo: to.toISOString(),
      };
    }

    return NextResponse.json({
      role: 'assistant',
      content: result.content,
      chart: result.chart ?? null,
      action: result.action ?? null,
    });

  } catch (e: unknown) {
    // Always return JSON so the frontend never sees "Error de connexió"
    return NextResponse.json({
      role: 'assistant',
      content: `Error en processar la consulta: ${e instanceof Error ? e.message : 'Error desconegut'}. Si el problema persisteix, comprova la configuració.`,
      chart: null,
      action: null,
    });
  }
}
