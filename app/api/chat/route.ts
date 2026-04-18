import { NextRequest, NextResponse } from 'next/server';
import type { ChatChartData } from '@/types';

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

interface MockResponse {
  content: string;
  chart?: ChatChartData;
}

function generateMockResponse(userMessage: string, stats: ChatStats): MockResponse {
  const msg = userMessage.toLowerCase();

  if (msg.includes('barri') || msg.includes('cerdanyola') || msg.includes('eixample') || msg.includes('barris') || msg.includes('zona')) {
    const barriData = Object.entries(stats.byBarri)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
    return {
      content: `El barri amb més missatges és **${stats.topBarri ?? 'N/D'}**. A continuació es mostra la distribució dels principals barris:`,
      chart: barriData.length > 0
        ? { type: 'bar', title: 'Missatges per barri', data: barriData }
        : undefined,
    };
  }

  if (msg.includes('canal') || msg.includes('telèfon') || msg.includes('web') || msg.includes('canals') || msg.includes('via')) {
    const canalData = Object.entries(stats.byCanal)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    return {
      content: `El canal principal és **"${stats.topCanal ?? 'N/D'}"**. Total de **${stats.total ?? 0}** missatges en el període.`,
      chart: canalData.length > 0
        ? { type: 'pie', title: 'Distribució per canal', data: canalData }
        : undefined,
    };
  }

  if (msg.includes('categoria') || msg.includes('categories') || msg.includes('tipus') || msg.includes('servei')) {
    const clas1Data = stats.byClas1
      ? Object.entries(stats.byClas1)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, value]) => ({ name, value }))
      : [];
    return {
      content: `La categoria principal és **"${stats.topCategory ?? 'N/D'}"**. El gràfic mostra les 8 categories amb més volum:`,
      chart: clas1Data.length > 0
        ? { type: 'bar', title: 'Missatges per categoria', data: clas1Data }
        : undefined,
    };
  }

  if (msg.includes('sentiment') || msg.includes('negatiu') || msg.includes('positiu') || msg.includes('satisfacci') || msg.includes('experiència')) {
    const sentVal = stats.avgSentiment;
    const sentLabel = sentVal === null ? 'N/D' : sentVal >= 7 ? 'positiu' : sentVal >= 4 ? 'neutre' : 'negatiu';
    return {
      content: `El sentiment mitjà és de **${sentVal !== null ? sentVal.toFixed(1) : 'N/D'}/10** (${sentLabel}). Hi ha **${stats.criticalCount}** missatges crítics (sentiment < 3).\n\nEls missatges crítics requereixen atenció prioritària.\n\n⚠️ Resposta d'exemple. Configura la clau d'API d'OpenAI per a respostes reals.`,
    };
  }

  if (msg.includes('alerta') || msg.includes('urgent') || msg.includes('crític') || msg.includes('prioritari')) {
    return {
      content: `Hi ha **${stats.criticalCount}** missatges amb sentiment crític (< 3) que requereixen atenció prioritària.\n\nPots veure el detall a la secció **"Alertes crítiques"** del dashboard.\n\n⚠️ Resposta d'exemple.`,
    };
  }

  if (msg.includes('resum') || msg.includes('general') || msg.includes('total') || msg.includes('overview') || msg.includes('dades')) {
    const barriData = Object.entries(stats.byBarri)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
    return {
      content: `**Resum del període:**\n• Total missatges: **${stats.total}**\n• Sentiment mitjà: **${stats.avgSentiment !== null ? stats.avgSentiment.toFixed(1) : 'N/D'}/10**\n• Missatges crítics: **${stats.criticalCount}**\n• Barri principal: **${stats.topBarri ?? 'N/D'}**\n• Canal principal: **${stats.topCanal ?? 'N/D'}**\n• Categoria principal: **${stats.topCategory ?? 'N/D'}**\n\n⚠️ Resposta d'exemple.`,
      chart: barriData.length > 0
        ? { type: 'bar', title: 'Top barris', data: barriData }
        : undefined,
    };
  }

  if (msg.includes('tendència') || msg.includes('evolució') || msg.includes('temps') || msg.includes('trend')) {
    return {
      content: `Per veure l'evolució temporal dels missatges, consulta la secció **"Tendències"** del dashboard, on trobaràs gràfics de línia i àrea amb la distribució per períodes.\n\nActualment hi ha **${stats.total}** missatges en el rang de dates seleccionat.\n\n⚠️ Resposta d'exemple.`,
    };
  }

  return {
    content: `He rebut la teva consulta. El dashboard mostra **${stats.total ?? 0}** missatges en el període seleccionat.\n\nPots preguntar-me sobre:\n• Barris i zones\n• Canals de comunicació\n• Categories i serveis\n• Sentiment i satisfacció\n• Alertes crítiques\n• Resum general\n\n⚠️ Configura la clau d'API d'OpenAI per a respostes personalitzades.`,
  };
}

export async function POST(req: NextRequest) {
  const body: ChatPayload = await req.json();
  const { messages, filters, apiKey: clientApiKey, stats: clientStats } = body;

  const stats: ChatStats = clientStats ?? {
    total: 0,
    avgSentiment: null,
    criticalCount: 0,
    topBarri: null,
    topCanal: null,
    topCategory: null,
    byBarri: {},
    byCanal: {},
  };

  const apiKey = clientApiKey || process.env.OPENAI_API_KEY || '';

  if (!apiKey) {
    const lastMsg = messages[messages.length - 1]?.content ?? '';
    const mockResp = generateMockResponse(lastMsg, stats);
    return NextResponse.json({
      role: 'assistant',
      content: mockResp.content,
      chart: mockResp.chart ?? null,
    });
  }

  const systemPrompt = `Ets un assistent analític expert per al SAC (Servei d'Atenció Ciutadana) de l'Ajuntament de Mataró.

Context de dades actuals (${filters?.from ? new Date(filters.from).toLocaleDateString('ca-ES') : ''} - ${filters?.to ? new Date(filters.to).toLocaleDateString('ca-ES') : ''}):
- Total missatges: ${stats.total}
- Sentiment mitjà: ${stats.avgSentiment !== null ? stats.avgSentiment.toFixed(2) + '/10' : 'N/D'}
- Missatges crítics (sentiment < 3): ${stats.criticalCount}
- Barri principal: ${stats.topBarri ?? 'N/D'}
- Canal principal: ${stats.topCanal ?? 'N/D'}
- Categoria principal: ${stats.topCategory ?? 'N/D'}
- Distribució per barris: ${JSON.stringify(stats.byBarri)}
- Distribució per canals: ${JSON.stringify(stats.byCanal)}
- Distribució per categories: ${JSON.stringify(stats.byClas1 ?? {})}

IMPORTANT: Respon SEMPRE en format JSON vàlid amb aquesta estructura exacta:
{
  "content": "text de la resposta en català (usa **negreta** per ressaltar valors importants)",
  "chart": null
}

Per a preguntes sobre barris o categories, inclou un gràfic de barres:
{
  "content": "text en català",
  "chart": { "type": "bar", "title": "Títol del gràfic", "data": [{"name": "Nom", "value": N}] }
}

Per a preguntes sobre canals, inclou un gràfic de pastís:
{
  "content": "text en català",
  "chart": { "type": "pie", "title": "Títol", "data": [{"name": "Canal", "value": N}] }
}

Per a preguntes sobre evolució temporal, usa tipus "area" o "line":
{
  "content": "text en català",
  "chart": { "type": "area", "title": "Títol", "data": [{"name": "Període", "value": N}] }
}

Sigues concís, usa dades concretes i respon en català.`;

  try {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content ?? '{}';
    let parsed: { content?: string; chart?: ChatChartData | null } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { content: raw }; }

    return NextResponse.json({
      role: 'assistant',
      content: parsed.content ?? raw,
      chart: parsed.chart ?? null,
    });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Error desconegut';
    return NextResponse.json({
      role: 'assistant',
      content: `Error al connectar amb OpenAI: ${errMsg}. Comprova que la clau d'API sigui vàlida.`,
      chart: null,
    }, { status: 200 });
  }
}
