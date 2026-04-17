'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useDateRange } from '@/context/DateRangeContext';
import { parseSentiment } from '@/lib/sentiment';
import { languageMeta, deptMeta } from '@/lib/intentColors';

interface TrendRow {
  sentiment: string | null;
  language: string | null;
  intent: string | null;
  canal: string | null;
  barri: string | null;
  department: string | null;
  citizen_experience_signal: string | null;
  action_required: string | null;
  followup_needed: boolean | null;
  data_inici: string | null;
}

export interface TrendComparison {
  label: string;
  value: number;
  hex: string;
}

export interface TrendInsight {
  id: string;
  severity: 'high' | 'medium' | 'info';
  title: string;
  description: string;
  metric?: string;
  comparison?: TrendComparison[];
  comparisonLabel?: string;
}

function mean(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function groupBy(rows: TrendRow[], fn: (r: TrendRow) => string | null): Map<string, TrendRow[]> {
  const map = new Map<string, TrendRow[]>();
  for (const r of rows) {
    const k = fn(r) ?? 'Desconegut';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return map;
}

function getSents(rows: TrendRow[]): number[] {
  return rows.map(r => parseSentiment(r.sentiment)).filter((s): s is number => s !== null);
}

const CANAL_HEX: Record<string, string> = {
  telefon: '#6366f1', web: '#0891b2', presencial: '#059669',
  email: '#d97706', app: '#dc2626', xarxes: '#ec4899',
};

function detectTrends(rows: TrendRow[]): TrendInsight[] {
  const insights: TrendInsight[] = [];
  const total = rows.length;
  if (total < 30) return insights;

  const allSents = getSents(rows);
  const globalAvgSent = mean(allSents);
  const globalNegPct = allSents.filter(s => s < 3.5).length / allSents.length * 100;
  const globalFollowupPct = rows.filter(r => r.followup_needed).length / total * 100;
  const globalQueixaPct = rows.filter(r => r.intent === 'queixa').length / total * 100;

  // ── 1. Language vs sentiment + complaint rate ──
  const byLang = groupBy(rows, r => r.language);
  const langStats = [...byLang.entries()].map(([lang, lr]) => {
    const sents = getSents(lr);
    return {
      lang, label: languageMeta(lang).label, hex: languageMeta(lang).hex,
      count: lr.length, avgSent: mean(sents),
      negPct: sents.length ? sents.filter(s => s < 3.5).length / sents.length * 100 : 0,
      queixaPct: lr.filter(r => r.intent === 'queixa').length / lr.length * 100,
    };
  }).filter(x => x.count >= Math.max(10, total * 0.05));

  if (langStats.length >= 2) {
    const sorted = [...langStats].sort((a, b) => a.avgSent - b.avgSent);
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    const gap = best.avgSent - worst.avgSent;
    if (gap >= 0.4) {
      insights.push({
        id: 'lang-sent-gap',
        severity: gap >= 0.9 ? 'high' : 'medium',
        title: `Els missatges en ${worst.label} tenen un sentiment ${gap.toFixed(1)} punts inferior`,
        description: `El sentiment mitjà en ${worst.label} és ${worst.avgSent.toFixed(1)}, davant el ${best.avgSent.toFixed(1)} en ${best.label}. A més, el ${worst.negPct.toFixed(0)}% dels seus missatges es classifiquen com a negatius. Pot reflectir una bretxa en la qualitat del servei percebuda per aquest grup lingüístic.`,
        metric: `${worst.avgSent.toFixed(1)} vs ${best.avgSent.toFixed(1)}`,
        comparison: langStats.map(l => ({ label: l.label, value: l.avgSent, hex: l.hex })),
        comparisonLabel: 'Sentiment mitjà (0–10)',
      });
    }

    const langWithHighQueixa = langStats.find(l => l.queixaPct > globalQueixaPct * 1.4);
    if (langWithHighQueixa) {
      const ratio = langWithHighQueixa.queixaPct / globalQueixaPct;
      insights.push({
        id: 'lang-queixa',
        severity: ratio > 1.8 ? 'medium' : 'info',
        title: `Parlants de ${langWithHighQueixa.label} presenten ${ratio.toFixed(1)}× més queixes`,
        description: `El ${langWithHighQueixa.queixaPct.toFixed(0)}% dels missatges en ${langWithHighQueixa.label} són queixes, enfront del ${globalQueixaPct.toFixed(0)}% global. Amb una proporció ${ratio.toFixed(1)} vegades superior, pot indicar una insatisfacció estructural en aquest segment.`,
        metric: `${langWithHighQueixa.queixaPct.toFixed(0)}% vs ${globalQueixaPct.toFixed(0)}% global`,
        comparison: langStats.map(l => ({ label: l.label, value: l.queixaPct, hex: l.hex })),
        comparisonLabel: '% queixes',
      });
    }
  }

  // ── 2. Department followup spike ──
  const byDept = groupBy(rows, r => r.department);
  const deptStats = [...byDept.entries()].map(([dept, dr]) => ({
    dept, label: deptMeta(dept).label, hex: deptMeta(dept).hex,
    count: dr.length,
    followupPct: dr.filter(r => r.followup_needed).length / dr.length * 100,
    urgentPct: dr.filter(r => r.action_required === 'desplaçament_físic' || r.action_required === 'reparar').length / dr.length * 100,
    frustratPct: dr.filter(r => r.citizen_experience_signal === 'reincident_frustrat').length / dr.length * 100,
  })).filter(x => x.count >= 15);

  const deptsSortedByFollowup = [...deptStats].sort((a, b) => b.followupPct - a.followupPct);
  if (deptsSortedByFollowup.length > 0) {
    const worst = deptsSortedByFollowup[0];
    if (worst.followupPct > globalFollowupPct * 1.5) {
      insights.push({
        id: 'dept-followup',
        severity: worst.followupPct > 80 ? 'high' : 'medium',
        title: `${worst.label} acumula el major pendent de seguiment (${worst.followupPct.toFixed(0)}%)`,
        description: `El ${worst.followupPct.toFixed(0)}% dels missatges d'aquest departament requereixen seguiment, ${(worst.followupPct / globalFollowupPct).toFixed(1)}× per sobre de la mitjana (${globalFollowupPct.toFixed(0)}%). Suggereix una càrrega de treball desproporcionada o processos de resolució ineficients.`,
        metric: `${(worst.followupPct / globalFollowupPct).toFixed(1)}× la mitja`,
        comparison: deptsSortedByFollowup.slice(0, 6).map(d => ({ label: d.label, value: d.followupPct, hex: d.hex })),
        comparisonLabel: '% seguiment pendent',
      });
    }
  }

  // ── 3. Canal sentiment outlier ──
  const byCanal = groupBy(rows, r => r.canal);
  const canalStats = [...byCanal.entries()].map(([canal, cr]) => {
    const sents = getSents(cr);
    return {
      canal, count: cr.length, avgSent: mean(sents),
      negPct: sents.length ? sents.filter(s => s < 3.5).length / sents.length * 100 : 0,
    };
  }).filter(x => x.count >= 10).sort((a, b) => a.avgSent - b.avgSent);

  if (canalStats.length >= 2) {
    const worst = canalStats[0];
    if (worst.avgSent < globalAvgSent - 0.6) {
      insights.push({
        id: 'canal-sentiment',
        severity: worst.avgSent < globalAvgSent - 1 ? 'high' : 'medium',
        title: `El canal "${worst.canal}" concentra les pitjors experiències`,
        description: `Sentiment mitjà de ${worst.avgSent.toFixed(1)} pels missatges via ${worst.canal}, ${(globalAvgSent - worst.avgSent).toFixed(1)} punts per sota de la mitjana global (${globalAvgSent.toFixed(1)}). El ${worst.negPct.toFixed(0)}% dels seus missatges són negatius. Podria indicar un problema d'atenció específic en aquest canal.`,
        metric: `${worst.avgSent.toFixed(1)} vs ${globalAvgSent.toFixed(1)} global`,
        comparison: canalStats.map(c => ({ label: c.canal, value: c.avgSent, hex: CANAL_HEX[c.canal] ?? '#94a3b8' })),
        comparisonLabel: 'Sentiment mitjà per canal',
      });
    }
  }

  // ── 4. Barri amb alta taxa crítica ──
  const byBarri = groupBy(rows, r => r.barri);
  const barriStats = [...byBarri.entries()].map(([barri, br]) => {
    const sents = getSents(br);
    const critCount = sents.filter(s => s < 3.5).length;
    return { barri, count: br.length, critCount, critPct: sents.length ? critCount / sents.length * 100 : 0, avgSent: mean(sents) };
  }).filter(x => x.count >= 10).sort((a, b) => b.critPct - a.critPct);

  if (barriStats.length > 0) {
    const worst = barriStats[0];
    if (worst.critPct > globalNegPct * 1.6) {
      insights.push({
        id: 'barri-critical',
        severity: worst.critPct > globalNegPct * 2.2 ? 'high' : 'medium',
        title: `${worst.barri} concentra una proporció ${(worst.critPct / globalNegPct).toFixed(1)}× superior de missatges crítics`,
        description: `El ${worst.critPct.toFixed(0)}% dels missatges de ${worst.barri} es classifiquen com a crítics (sentiment < 3.5), davant el ${globalNegPct.toFixed(0)}% global. Amb ${worst.critCount} missatges crítics i un sentiment mitjà de ${worst.avgSent.toFixed(1)}, és el barri que necessita atenció prioritària.`,
        metric: `${worst.critPct.toFixed(0)}% crític (global: ${globalNegPct.toFixed(0)}%)`,
        comparison: barriStats.slice(0, 6).map(b => ({ label: b.barri, value: b.critPct, hex: '#ef4444' })),
        comparisonLabel: '% missatges crítics per barri',
      });
    }
  }

  // ── 5. Reincidents frustrats concentrats ──
  const frustratCount = rows.filter(r => r.citizen_experience_signal === 'reincident_frustrat').length;
  const frustratPct = frustratCount / total * 100;
  if (frustratPct >= 8) {
    const frustratByDept = deptStats
      .map(d => ({ ...d, frustratVal: d.frustratPct }))
      .sort((a, b) => b.frustratVal - a.frustratVal);
    insights.push({
      id: 'reincident-frustrat',
      severity: frustratPct >= 20 ? 'high' : 'medium',
      title: `${frustratPct.toFixed(0)}% dels missatges provenen de ciutadans reincidents frustrats`,
      description: `${frustratCount.toLocaleString('ca-ES')} missatges corresponen a persones que han tornat a contactar sense resoldre el seu problema anterior. ${frustratByDept[0] ? `La concentració és màxima a ${frustratByDept[0].label} (${frustratByDept[0].frustratPct.toFixed(0)}% dels seus missatges).` : ''} Un nivell alt de reincidència apunta a mancances en la resolució definitiva de casos.`,
      metric: `${frustratCount.toLocaleString('ca-ES')} ciutadans`,
      comparison: frustratByDept.slice(0, 6).map(d => ({ label: d.label, value: d.frustratPct, hex: '#ec4899' })),
      comparisonLabel: '% reincidents frustrats per departament',
    });
  }

  // ── 6. Pics horaris de negativitat ──
  const hourGroups = new Map<number, TrendRow[]>();
  for (const r of rows) {
    if (!r.data_inici) continue;
    const h = new Date(r.data_inici).getHours();
    if (!hourGroups.has(h)) hourGroups.set(h, []);
    hourGroups.get(h)!.push(r);
  }
  const hourStats = [...hourGroups.entries()].map(([hour, hr]) => {
    const sents = getSents(hr);
    return { hour, count: hr.length, negPct: sents.length ? sents.filter(s => s < 3.5).length / sents.length * 100 : 0 };
  }).filter(x => x.count >= Math.max(5, total * 0.02)).sort((a, b) => b.negPct - a.negPct);

  if (hourStats.length > 0) {
    const peak = hourStats[0];
    if (peak.negPct > globalNegPct * 1.7) {
      insights.push({
        id: 'hour-peak',
        severity: 'info',
        title: `Pic de missatges negatius a les ${peak.hour}:00h (${peak.negPct.toFixed(0)}% negatius)`,
        description: `A les ${peak.hour}:00h el ${peak.negPct.toFixed(0)}% dels missatges rebuts són negatius, ${(peak.negPct / globalNegPct).toFixed(1)}× per sobre de la mitjana global. Pot indicar una franja horària de major pressió o saturació del servei que convé reforçar.`,
        metric: `${peak.negPct.toFixed(0)}% negatiu vs ${globalNegPct.toFixed(0)}% global`,
        comparison: [...hourGroups.entries()]
          .map(([h, hr]) => { const s = getSents(hr); return { label: `${h}h`, value: s.length ? s.filter(x => x < 3.5).length / s.length * 100 : 0, hex: '#6366f1' }; })
          .filter(x => hourGroups.get(parseInt(x.label))!.length >= Math.max(5, total * 0.02))
          .sort((a, b) => parseInt(a.label) - parseInt(b.label)),
        comparisonLabel: '% negatiu per hora',
      });
    }
  }

  // ── 7. Urgència d'accions física ──
  const urgentCount = rows.filter(r => r.action_required === 'desplaçament_físic' || r.action_required === 'reparar').length;
  const urgentPct = urgentCount / total * 100;
  if (urgentPct >= 12) {
    const topUrgentDept = deptStats.sort((a, b) => b.urgentPct - a.urgentPct)[0];
    insights.push({
      id: 'urgent-actions',
      severity: urgentPct >= 25 ? 'high' : 'medium',
      title: `${urgentPct.toFixed(0)}% dels missatges exigeixen intervenció física`,
      description: `${urgentCount.toLocaleString('ca-ES')} missatges (${urgentPct.toFixed(0)}%) requereixen desplaçament o reparació in situ. ${topUrgentDept ? `El departament amb major càrrega d'urgències és ${topUrgentDept.label} (${topUrgentDept.urgentPct.toFixed(0)}% dels seus missatges).` : ''} Indica una pressió logística i operativa significativa.`,
      metric: `${urgentCount} missatges urgents`,
      comparison: deptStats.slice(0, 6).map(d => ({ label: d.label, value: d.urgentPct, hex: '#f97316' })),
      comparisonLabel: '% accions urgents per departament',
    });
  }

  const ORDER: Record<string, number> = { high: 0, medium: 1, info: 2 };
  return insights.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

export function useTrends() {
  const { from, to } = useDateRange();
  const [insights, setInsights] = useState<TrendInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('sac_messages')
        .select('sentiment,language,intent,canal,barri,department,citizen_experience_signal,action_required,followup_needed,data_inici')
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString());

      setInsights(detectTrends((data ?? []) as TrendRow[]));
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [from.toISOString(), to.toISOString()]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { insights, loading };
}
