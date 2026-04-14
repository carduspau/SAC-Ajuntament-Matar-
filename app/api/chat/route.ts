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

  if (msg.includes('barri') || msg.includes('cerdanyola') || msg.includes('eixample') || msg.includes('barris')) {
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

  if (msg.includes('canal') || msg.includes('telèfon') || msg.includes('web') || msg.includes('canals')) {
    const canalData = Object.entries(stats.byCanal)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    return {
      content: `El canal principal és **"${stats.topCanal ?? 'N/D'}"**. Total de ${stats.total ?? 0} missatges en el període.`,
      chart: canalData.length > 0
        ? { type: 'pie', title: 'Distribució per canal', data: canalData }
        : undefined,
    };
  }

  if (msg.includes('categoria') || msg.includes('categories') || msg.includes('tipus')) {
    const clas1Data = stats.byClas1
      ? Object.entries(stats.byClas1)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, value]) => ({ name, value }))
      : [];
    return {
      content: `La categoria principal és **"${stats.topCategory ?? 'N/D'}"**.`,
      chart: clas1Data.length > 0
        ? { type: 'bar', title: 'Missatges per categoria', data: clas1Data }
        : undefined,
    };
  }

  if (msg.includes('sentiment') || msg.includes('negatiu') || msg.includes('positiu')) {
    return {
      content: `Basant-me en les dades del període, el sentiment mitjà és de **${
        stats.avgSentiment ? stats.avgSentiment.toFixed(1) : 'N/D'
      }/10**. Hi ha ${stats.criticalCount ?? 0} missatges crítics (sentiment < 3).\n\n⚠️ Resposta d'exemple. Configura la clau d'API d'OpenAI per respostes reals.`,
    };
  }

  if (msg.includes('alerta') || msg.includes('urgent') || msg.includes('crític')) {
    return {
      content: `Hi ha **${stats.criticalCount ?? 0}** missatges amb sentiment crític (< 3) que requereixen atenció prioritària. Pots veure el detall a la secció "Alertes crítiques".\n\n⚠️ Resposta d'exemple.`,
    };
  }

  return {
    content: `He rebut la teva consulta. El dashboard mostra **${stats.total ?? 0}** missatges en el període seleccionat.\n\nPots preguntar-me sobre: barris, canals, categories, sentiments, alertes.\n\n⚠️ Aquesta és una resposta d'exemple. Per activar el xatbot real, configura la clau d'API d'OpenAI.`,
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
- Missatges crítics: ${stats.criticalCount}
- Barri principal: ${stats.topBarri ?? 'N/D'}
- Canal principal: ${stats.topCanal ?? 'N/D'}
- Categoria principal: ${stats.topCategory ?? 'N/D'}
- Barris (top 5): ${JSON.stringify(stats.byBarri)}
- Canals: ${JSON.stringify(stats.byCanal)}

Respon SEMPRE en format JSON amb aquesta estructura exacta:
{ "content": "text de la resposta en català", "chart": null }

Si la pregunta és sobre barris, respon amb:
{ "content": "text en català", "chart": { "type": "bar", "title": "Missatges per barri", "data": [{"name": "Barri", "value": N}] } }

Si la pregunta és sobre canals, respon amb:
{ "content": "text en català", "chart": { "type": "pie", "title": "Per canal", "data": [{"name": "Canal", "value": N}] } }

Sigues concís i usa dades concretes.`;

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
      max_tokens: 600,
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
