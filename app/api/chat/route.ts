import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
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

// ─── Date parsing ─────────────────────────────────────────────────────────────

const MONTHS_CA: Record<string, number> = {
  'gener': 0, 'febrer': 1, 'març': 2, 'abril': 3, 'maig': 4, 'juny': 5,
  'juliol': 6, 'agost': 7, 'setembre': 8, 'octubre': 9, 'novembre': 10, 'desembre': 11,
  // Spanish fallback (octubre already covered above)
  'enero': 0, 'febrero': 1, 'marzo': 2, 'mayo': 4, 'junio': 5,
  'julio': 6, 'agosto': 7, 'septiembre': 8, 'noviembre': 10, 'diciembre': 11,
};

function parseDateRange(text: string, defaultFrom: Date, defaultTo: Date): { from: Date; to: Date; explicit: boolean } {
  const monthPat = Object.keys(MONTHS_CA).join('|');

  // "abril de 2026" / "abril 2026"
  const mym = text.match(new RegExp(`(${monthPat})\\s+(?:de(?:l)?\\s+)?(\\d{4})`, 'i'));
  if (mym) {
    const month = MONTHS_CA[mym[1].toLowerCase()];
    const year = parseInt(mym[2]);
    return {
      from: new Date(year, month, 1),
      to: new Date(year, month + 1, 0, 23, 59, 59, 999),
      explicit: true,
    };
  }

  // "any 2025" / "l'any 2025"
  const ym = text.match(/\bany\s+(20\d{2})\b/i);
  if (ym) {
    const year = parseInt(ym[1]);
    return { from: new Date(year, 0, 1), to: new Date(year, 11, 31, 23, 59, 59, 999), explicit: true };
  }

  // "últims N dies"
  const ldm = text.match(/\b(?:darrers|últims|ultimos)\s+(\d+)\s+dies\b/i);
  if (ldm) {
    const days = parseInt(ldm[1]);
    const to = new Date();
    const from = new Date(to.getTime() - days * 86400000);
    return { from, to, explicit: true };
  }

  return { from: defaultFrom, to: defaultTo, explicit: false };
}

// ─── Barri extraction ─────────────────────────────────────────────────────────

function extractBarri(text: string): string | null {
  // "barri de/del/de la/del" → next proper noun
  const m = text.match(/barri\s+(?:de(?:l|ls|s)?\s+(?:la\s+|el\s+|les\s+|els\s+)?)?([A-ZÁÀÉÈÍÏÓÒÚÜÇÑ][a-záàéèíïóòúüçñA-ZÁÀÉÈÍÏÓÒÚÜÇÑ\-' ]+?)(?=\s+(?:de|del|durant|en|el|la|les|els|i|o|,|\.|\n|$))/i);
  if (m) return m[1].trim();

  // Standalone known barri patterns
  const known = [
    'Cerdanyola', 'Eixample', 'Palau', 'Llàntia', 'Cirera', 'Rocafonda',
    'Santes', 'Molinet', 'Vista Alegre', 'Peramàs', 'Sorrall', 'Havana',
    'Boet', 'Quirze', 'Vallveric', 'Batlleix', 'Lazareto', 'Pla d\'en',
  ];
  const lower = text.toLowerCase();
  for (const b of known) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  return null;
}

// ─── Category keyword extraction ──────────────────────────────────────────────

function extractClas1Keyword(text: string): string | null {
  const lower = text.toLowerCase();
  const patterns: [string, string][] = [
    ['neteja', 'neteja'],
    ['residus', 'residus'],
    ['via pública', 'via'],
    ['via publica', 'via'],
    ['vies públiques', 'via'],
    ['vies publiques', 'via'],
    ['llicència', 'llicènc'],
    ['llicencia', 'llicènc'],
    ['llum', 'llum'],
    ['enllumenat', 'llum'],
    ['soroll', 'soroll'],
    ['sorolls', 'soroll'],
    ['trànsit', 'trànsit'],
    ['transit', 'trànsit'],
    ['urbanisme', 'urbanisme'],
    ['obres', 'obres'],
    ['parcs', 'parc'],
    ['jardins', 'parc'],
    ['transport', 'transport'],
    ['seguretat', 'seguretat'],
    ['clavegueram', 'clavegueram'],
    ['habitatge', 'habitatge'],
    ['animals', 'animals'],
    ['plagues', 'plagues'],
    ['aigues', 'aigues'],
    ['aigües', 'aigues'],
    ['medi ambient', 'medi'],
    ['cementi', 'cementi'],
    ['esports', 'esport'],
  ];
  for (const [keyword, search] of patterns) {
    if (lower.includes(keyword)) return search;
  }
  return null;
}

// ─── Query type detection ─────────────────────────────────────────────────────

function detectQueryType(text: string): 'timeline' | 'barri' | 'canal' | 'clas1' | 'sentiment' | 'alerts' | 'navigate' | 'general' {
  const lower = text.toLowerCase();
  if (/evolució|evolutiu|temporal|per dies|per mesos|gràfic.*temps|tendència|trend|timeline/i.test(lower)) return 'timeline';
  if (/barri|barris|zona|zones/i.test(lower)) return 'barri';
  if (/canal|canals|telèfon|web|presencial|correu/i.test(lower)) return 'canal';
  if (/categoria|categories|tipus|classe/i.test(lower)) return 'clas1';
  if (/sentiment|satisfacci|valoració|positiu|negatiu|puntuació/i.test(lower)) return 'sentiment';
  if (/alerta|alertes|crític|urgent|prioritari/i.test(lower)) return 'alerts';
  if (/porta'm|porta'ns|ves a|navega|obre|mostra'm la pàgina|anar a/i.test(lower)) return 'navigate';
  return 'general';
}

function detectNavigationTarget(text: string): string | null {
  const lower = text.toLowerCase();
  if (/alertes|alertas|crítiques|critiques/i.test(lower)) return '/alertes';
  if (/estadíst|estadist/i.test(lower)) return '/estadistiques';
  if (/tendènci|tendenci/i.test(lower)) return '/tendencies';
  if (/mapa/i.test(lower)) return '/mapa';
  if (/barris/i.test(lower)) return '/barris';
  if (/missatge|missatg|mensaje/i.test(lower)) return '/missatges';
  if (/informe/i.test(lower)) return '/informes';
  if (/inici|inicio|home/i.test(lower)) return '/';
  return null;
}

// ─── Real Supabase queries ────────────────────────────────────────────────────

async function runTimelineQuery(
  supabase: ReturnType<typeof createServerSupabase>,
  from: Date, to: Date,
  barri: string | null, clas1: string | null
): Promise<QueryResult> {
  let q = supabase.from('sac_messages')
    .select('data_inici,sentiment')
    .gte('data_inici', from.toISOString())
    .lte('data_inici', to.toISOString());

  if (barri) q = (q as typeof q).ilike('barri', `%${barri}%`);
  if (clas1) q = (q as typeof q).ilike('clas1', `%${clas1}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  if (rows.length === 0) {
    const filters: string[] = [];
    if (barri) filters.push(`barri "${barri}"`);
    if (clas1) filters.push(`categoria "${clas1}"`);
    return {
      content: `No s'han trobat dades${filters.length ? ` per a ${filters.join(' i ')}` : ''} en el període ${from.toLocaleDateString('ca-ES')} – ${to.toLocaleDateString('ca-ES')}.`,
      rowCount: 0,
    };
  }

  // Group by day
  const dayMap = new Map<string, number>();
  for (const r of rows) {
    if (!r.data_inici) continue;
    const day = r.data_inici.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const chartData = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name: name.slice(5), value })); // show MM-DD

  const titleParts: string[] = ['Evolució diària'];
  if (clas1) titleParts.push(clas1);
  if (barri) titleParts.push(barri);

  const filters: string[] = [];
  if (barri) filters.push(`barri **${barri}**`);
  if (clas1) filters.push(`categoria **${clas1}**`);

  // Build navigate action to see messages
  const params = new URLSearchParams();
  if (barri) params.set('barri', barri);
  if (clas1) params.set('clas1', clas1);
  const href = `/missatges${params.toString() ? '?' + params.toString() : ''}`;

  return {
    content: `He trobat **${rows.length}** missatges${filters.length ? ` de ${filters.join(', ')}` : ''} entre el **${from.toLocaleDateString('ca-ES')}** i el **${to.toLocaleDateString('ca-ES')}**.`,
    chart: chartData.length > 0
      ? { type: 'area', title: titleParts.join(' · '), data: chartData }
      : undefined,
    action: {
      type: 'navigate',
      label: `Veure els ${rows.length} missatges a la llista`,
      href,
    },
    rowCount: rows.length,
  };
}

async function runStatsQuery(
  supabase: ReturnType<typeof createServerSupabase>,
  from: Date, to: Date,
  barri: string | null, clas1: string | null,
  groupBy: 'barri' | 'canal' | 'clas1'
): Promise<QueryResult> {
  let q = supabase.from('sac_messages')
    .select('barri,canal,clas1,sentiment')
    .gte('data_inici', from.toISOString())
    .lte('data_inici', to.toISOString());

  if (barri) q = (q as typeof q).ilike('barri', `%${barri}%`);
  if (clas1) q = (q as typeof q).ilike('clas1', `%${clas1}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  if (rows.length === 0) {
    return { content: 'No s\'han trobat dades per als filtres especificats.', rowCount: 0 };
  }

  const countMap = new Map<string, number>();
  for (const r of rows) {
    const key = (groupBy === 'barri' ? r.barri : groupBy === 'canal' ? r.canal : r.clas1) ?? 'Desconegut';
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  const chartData = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  const titles: Record<string, string> = { barri: 'Missatges per barri', canal: 'Distribució per canal', clas1: 'Missatges per categoria' };
  const chartType: ChatChartData['type'] = groupBy === 'canal' ? 'pie' : 'bar';
  const top = chartData[0];

  const sentiments = rows.map(r => parseSentiment(r.sentiment)).filter(s => s !== null) as number[];
  const avg = sentiments.length > 0 ? (sentiments.reduce((a, b) => a + b, 0) / sentiments.length).toFixed(1) : 'N/D';

  const labelMap: Record<string, string> = { barri: 'barri', canal: 'canal', clas1: 'categoria' };
  const content = `He analitzat **${rows.length}** missatges.\n${top ? `El ${labelMap[groupBy]} principal és **"${top.name}"** amb **${top.value}** missatges.` : ''}\nSentiment mitjà: **${avg}/10**`;

  return {
    content,
    chart: { type: chartType, title: titles[groupBy], data: chartData },
    rowCount: rows.length,
  };
}

async function runSentimentQuery(
  supabase: ReturnType<typeof createServerSupabase>,
  from: Date, to: Date,
  barri: string | null, clas1: string | null
): Promise<QueryResult> {
  let q = supabase.from('sac_messages')
    .select('sentiment,barri')
    .gte('data_inici', from.toISOString())
    .lte('data_inici', to.toISOString());

  if (barri) q = (q as typeof q).ilike('barri', `%${barri}%`);
  if (clas1) q = (q as typeof q).ilike('clas1', `%${clas1}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const sentiments = rows.map(r => parseSentiment(r.sentiment)).filter(s => s !== null) as number[];
  if (sentiments.length === 0) return { content: 'No hi ha dades de sentiment per al filtre seleccionat.', rowCount: 0 };

  const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  const critical = sentiments.filter(s => s < 3.5).length;
  const positive = sentiments.filter(s => s >= 7).length;
  const label = avg >= 7 ? 'positiu' : avg >= 4 ? 'neutre' : 'negatiu';

  // Distribution chart
  const buckets: Record<string, number> = {};
  for (let i = 0; i <= 9; i++) buckets[`${i}-${i + 1}`] = 0;
  for (const s of sentiments) {
    const b = Math.min(Math.floor(s), 9);
    buckets[`${b}-${b + 1}`] = (buckets[`${b}-${b + 1}`] ?? 0) + 1;
  }
  const chartData = Object.entries(buckets).map(([name, value]) => ({ name, value }));

  const filterNote = barri ? ` al barri **${barri}**` : '';
  return {
    content: `Sentiment${filterNote}: **${avg.toFixed(1)}/10** (${label})\n• Missatges crítics (< 3.5): **${critical}** (${Math.round(critical / sentiments.length * 100)}%)\n• Missatges positius (≥ 7): **${positive}** (${Math.round(positive / sentiments.length * 100)}%)\n• Total analitzats: **${sentiments.length}**`,
    chart: { type: 'bar', title: 'Distribució del sentiment', data: chartData },
    rowCount: rows.length,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body: ChatPayload = await req.json();
  const { messages, filters, apiKey: clientApiKey, stats: clientStats } = body;

  const defaultFrom = filters?.from ? new Date(filters.from) : new Date(Date.now() - 30 * 86400000);
  const defaultTo = filters?.to ? new Date(filters.to) : new Date();
  const lastMsg = messages[messages.length - 1]?.content ?? '';

  const { from, to, explicit: explicitDate } = parseDateRange(lastMsg, defaultFrom, defaultTo);
  const barri = extractBarri(lastMsg);
  const clas1Keyword = extractClas1Keyword(lastMsg);
  const queryType = detectQueryType(lastMsg);

  // Always query real data from Supabase
  const supabase = createServerSupabase();

  try {
    let result: QueryResult;

    if (queryType === 'navigate') {
      const href = detectNavigationTarget(lastMsg) ?? '/';
      const pageNames: Record<string, string> = {
        '/alertes': 'Alertes crítiques',
        '/estadistiques': 'Estadístiques',
        '/tendencies': 'Tendències',
        '/mapa': 'Mapa',
        '/barris': 'Barris',
        '/missatges': 'Missatges',
        '/informes': 'Informes',
        '/': 'Inici',
      };
      result = {
        content: `D'acord! Et porto a la pàgina **${pageNames[href] ?? href}**.`,
        action: { type: 'navigate', href, label: `Anar a ${pageNames[href] ?? href}` },
        rowCount: 0,
      };
    } else if (queryType === 'timeline') {
      result = await runTimelineQuery(supabase, from, to, barri, clas1Keyword);
    } else if (queryType === 'canal') {
      result = await runStatsQuery(supabase, from, to, barri, clas1Keyword, 'canal');
    } else if (queryType === 'clas1') {
      result = await runStatsQuery(supabase, from, to, barri, clas1Keyword, 'clas1');
    } else if (queryType === 'sentiment') {
      result = await runSentimentQuery(supabase, from, to, barri, clas1Keyword);
    } else if (queryType === 'alerts') {
      let q = supabase.from('sac_messages')
        .select('sentiment,barri,canal,data_inici')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString());
      const { data } = await q;
      const rows = data ?? [];
      const critical = rows.filter(r => {
        const s = parseSentiment(r.sentiment);
        return s !== null && s < 3.5;
      });
      result = {
        content: `Hi ha **${critical.length}** missatges crítics (sentiment < 3.5) de **${rows.length}** totals en el període.\n\nRepresenten el **${rows.length > 0 ? Math.round(critical.length / rows.length * 100) : 0}%** del total.`,
        action: { type: 'navigate', href: '/alertes', label: 'Veure alertes crítiques' },
        rowCount: critical.length,
      };
    } else if (queryType === 'barri') {
      result = await runStatsQuery(supabase, from, to, barri, clas1Keyword, 'barri');
    } else {
      // General: run barri stats as default
      result = await runStatsQuery(supabase, from, to, barri, clas1Keyword, 'barri');
    }

    // If OpenAI key is available, enhance the text response
    const apiKey = clientApiKey || process.env.OPENAI_API_KEY || '';
    if (apiKey && result.rowCount > 0) {
      try {
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey });
        const dataContext = `Consulta de l'usuari: "${lastMsg}"\nPeriode: ${from.toLocaleDateString('ca-ES')} – ${to.toLocaleDateString('ca-ES')}\nResultat de la query: ${result.rowCount} files trobades.\nContingut generat: ${result.content}`;
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Ets un assistent analític del SAC de Mataró. Tens el resultat d'una query real a la BD. Millora el text de resposta en català: sigues concís, usa **negreta** per valors importants. Retorna JSON: {"content": "text millorat"}. NO canviïs els números ni inventes dades.`,
            },
            { role: 'user', content: dataContext },
          ],
          temperature: 0.2,
          max_tokens: 300,
          response_format: { type: 'json_object' },
        });
        const raw = completion.choices[0].message.content ?? '{}';
        const parsed = JSON.parse(raw) as { content?: string };
        if (parsed.content) result.content = parsed.content;
      } catch {
        // OpenAI failed, keep the template-generated content
      }
    }

    // Add period note if using explicit date from message (different from dashboard filter)
    if (explicitDate) {
      result.content += `\n\n_Dades filtrades per: ${from.toLocaleDateString('ca-ES')} – ${to.toLocaleDateString('ca-ES')}_`;
      if (!result.action) {
        result.action = {
          type: 'setFilter',
          label: `Aplicar aquest rang al dashboard`,
          dateFrom: from.toISOString(),
          dateTo: to.toISOString(),
        };
      }
    }

    return NextResponse.json({
      role: 'assistant',
      content: result.content,
      chart: result.chart ?? null,
      action: result.action ?? null,
    });

  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Error desconegut';
    return NextResponse.json({
      role: 'assistant',
      content: `Error en consultar les dades: ${errMsg}`,
      chart: null,
      action: null,
    }, { status: 200 });
  }
}
