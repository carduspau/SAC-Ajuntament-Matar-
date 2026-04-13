import { NextRequest, NextResponse } from 'next/server';

interface ChatStats {
  total: number;
  avgSentiment: number | null;
  criticalCount: number;
  topBarri: string | null;
  topCanal: string | null;
  topCategory: string | null;
  byBarri: Record<string, number>;
  byCanal: Record<string, number>;
}

interface ChatPayload {
  messages: { role: 'user' | 'assistant'; content: string }[];
  filters?: { from?: string; to?: string };
  apiKey?: string;
  stats?: ChatStats;
}

function generateMockResponse(userMessage: string, stats: ChatStats): string {
  const msg = userMessage.toLowerCase();
  if (msg.includes('sentiment') || msg.includes('negatiu') || msg.includes('positiu')) {
    return `Basant-me en les dades del període seleccionat, el sentiment mitjà és de ${
      stats.avgSentiment ? stats.avgSentiment.toFixed(1) : 'N/D'
    }/10. Hi ha ${stats.criticalCount ?? 0} missatges crítics (sentiment < 3). Nota: aquesta és una resposta d'exemple. Configura la clau d'API d'OpenAI per obtenir respostes reals.`;
  }
  if (msg.includes('barri') || msg.includes('cerdanyola') || msg.includes('eixample')) {
    return `El barri amb més missatges és ${
      stats.topBarri ?? 'Eixample'
    }. Per obtenir una anàlisi detallada per barri, pots accedir a la secció "Barris" del dashboard. Nota: resposta d'exemple sense clau d'API.`;
  }
  if (msg.includes('canal') || msg.includes('telèfon') || msg.includes('web')) {
    return `El canal principal de comunicació és "${stats.topCanal ?? 'Telèfon del civisme'}". Les dades mostren que ${stats.total ?? 0} missatges s'han rebut en total durant el període. Nota: resposta d'exemple.`;
  }
  if (msg.includes('alerta') || msg.includes('urgent') || msg.includes('crític')) {
    return `Hi ha ${stats.criticalCount ?? 0} missatges amb sentiment crític (< 3) que requereixen atenció prioritària. Et recomano revisar la secció "Inici" per veure el panell d'alertes. Nota: resposta d'exemple.`;
  }
  return `He rebut la teva consulta: "${userMessage}". El dashboard mostra ${stats.total ?? 0} missatges en el període seleccionat.
Per a una anàlisi més detallada, pots explorar les seccions d'Estadístiques, Mapa o Barris.

⚠️ Aquesta és una resposta d'exemple. Per activar el xatbot real, configura la clau d'API d'OpenAI a la configuració (icona de configuració del xat).`;
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
    return NextResponse.json({
      role: 'assistant',
      content: generateMockResponse(lastMsg, stats),
    });
  }

  const systemPrompt = `Ets un assistent analític expert per al SAC (Servei d'Atenció Ciutadana) de l'Ajuntament de Mataró. Analitzes dades de missatges ciutadans i ajudes els funcionaris a entendre les tendències i prioritzar actuacions.

Context de dades actuals (${filters?.from ? new Date(filters.from).toLocaleDateString('ca-ES') : ''} - ${filters?.to ? new Date(filters.to).toLocaleDateString('ca-ES') : ''}):
- Total missatges: ${stats.total}
- Sentiment mitjà: ${stats.avgSentiment !== null ? stats.avgSentiment.toFixed(2) + '/10' : 'N/D'}
- Missatges crítics (sentiment < 3): ${stats.criticalCount}
- Barri amb més missatges: ${stats.topBarri ?? 'N/D'}
- Canal principal: ${stats.topCanal ?? 'N/D'}
- Categoria principal: ${stats.topCategory ?? 'N/D'}
- Distribució per barri (top 5): ${JSON.stringify(stats.byBarri)}
- Distribució per canal: ${JSON.stringify(stats.byCanal)}

Respon sempre en català. Sigues concís, analític i usa dades concretes quan sigui possible.`;

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
      max_tokens: 500,
    });
    return NextResponse.json(completion.choices[0].message);
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Error desconegut';
    return NextResponse.json({
      role: 'assistant',
      content: `Error al connectar amb OpenAI: ${errMsg}. Comprova que la clau d'API sigui vàlida.`,
    }, { status: 200 });
  }
}
