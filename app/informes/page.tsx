'use client';

import React, { useState, useRef } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';
import { FileText, Download, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { SentimentHistogram } from '@/components/charts/SentimentHistogram';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { ChannelPieChart } from '@/components/charts/ChannelPieChart';
import { NeighborhoodBarChart } from '@/components/charts/NeighborhoodBarChart';
import { useStats } from '@/hooks/useStats';
import { useTimeline } from '@/hooks/useTimeline';
import { useEnrichedStats } from '@/hooks/useEnrichedStats';
import { useTrends } from '@/hooks/useTrends';
import { useDateRange } from '@/context/DateRangeContext';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { exportReportToPdf } from '@/lib/pdf';
import { intentMeta, actionMeta, experienceMeta, languageMeta, deptMeta } from '@/lib/intentColors';

const INTENT_ORDER = ['queixa', 'incidència', 'consulta', 'sol·licitud', 'suggeriment', 'agraïment'];
const ACTION_ORDER = ['desplaçament_físic', 'reparar', 'investigar', 'derivar', 'informar'];
const EXP_ORDER    = ['primera_interacció', 'reincident_satisfet', 'reincident_frustrat'];

const SEVERITY_COLOR = { high: '#ef4444', medium: '#f97316', info: '#3b82f6' };

interface SectionConfig {
  timeline: boolean; sentiment: boolean; categories: boolean;
  channels: boolean; neighborhoods: boolean;
  intent: boolean; departments: boolean; actions: boolean;
  experience: boolean; language: boolean; followup: boolean;
  alerts: boolean; trends: boolean;
}

const PRESETS: Record<string, SectionConfig> = {
  executiu: {
    timeline: true, sentiment: true, categories: false, channels: false, neighborhoods: false,
    intent: true, departments: false, actions: false, experience: false, language: false,
    followup: true, alerts: true, trends: true,
  },
  operatiu: {
    timeline: false, sentiment: false, categories: true, channels: true, neighborhoods: false,
    intent: true, departments: true, actions: true, experience: true, language: false,
    followup: true, alerts: true, trends: false,
  },
  complet: {
    timeline: true, sentiment: true, categories: true, channels: true, neighborhoods: true,
    intent: true, departments: true, actions: true, experience: true, language: true,
    followup: true, alerts: true, trends: true,
  },
};

const SECTION_GROUPS = [
  { label: 'Dades generals', keys: [
    { key: 'timeline'     as const, label: 'Evolució temporal' },
    { key: 'sentiment'    as const, label: 'Distribució de sentiment' },
    { key: 'categories'   as const, label: 'Categories principals' },
    { key: 'channels'     as const, label: 'Canals' },
    { key: 'neighborhoods' as const, label: 'Barris' },
  ]},
  { label: 'Classificació i gestió', keys: [
    { key: 'intent'       as const, label: 'Distribució per intenció' },
    { key: 'departments'  as const, label: 'Per departament' },
    { key: 'actions'      as const, label: 'Acció requerida' },
    { key: 'experience'   as const, label: 'Experiència ciutadana' },
    { key: 'language'     as const, label: 'Distribució per idioma' },
    { key: 'followup'     as const, label: 'Seguiment pendent' },
  ]},
  { label: 'Anàlisi avançada', keys: [
    { key: 'alerts'       as const, label: 'Alertes crítiques' },
    { key: 'trends'       as const, label: 'Tendències detectades' },
  ]},
];

const H2 = { fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '10px', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' };
const SEC = { marginBottom: '26px' };

export default function InformesPage() {
  const { from, to, granularity } = useDateRange();
  const { data: stats, loading: statsLoading } = useStats();
  const { data: timeline, loading: timelineLoading } = useTimeline();
  const { data: enriched } = useEnrichedStats();
  const { insights } = useTrends();
  const previewRef = useRef<HTMLDivElement>(null);

  const [sections, setSections]       = useState<SectionConfig>(PRESETS.complet);
  const [activePreset, setActivePreset] = useState('complet');
  const [reportTitle, setReportTitle] = useState('Informe SAC');
  const [reportAuthor, setReportAuthor] = useState('Ajuntament de Mataró');
  const [accentColor, setAccentColor] = useState('#4f46e5');
  const [aiSummary, setAiSummary]     = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [exporting, setExporting]     = useState(false);

  function applyPreset(name: string) {
    setActivePreset(name);
    setSections(PRESETS[name]);
  }
  function toggle(key: keyof SectionConfig) {
    setActivePreset('custom');
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function generateAISummary() {
    setGeneratingAI(true);
    try {
      const apiKey = typeof window !== 'undefined' ? (localStorage.getItem('sac_openai_key') ?? '') : '';
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Genera un resum executiu breu (màxim 200 paraules) en català per a un informe del SAC. Període: ${format(from, 'dd/MM/yyyy', { locale: ca })} - ${format(to, 'dd/MM/yyyy', { locale: ca })}. Inclou: principals observacions, alertes importants, i 2-3 recomanacions concretes. Format: text net sense markdown.` }],
          filters: { from: from.toISOString(), to: to.toISOString() },
          apiKey: apiKey || undefined,
        }),
      });
      const data = await res.json();
      setAiSummary(data.content ?? '');
    } catch { setAiSummary('No s\'ha pogut generar el resum.'); }
    finally { setGeneratingAI(false); }
  }

  async function handleExport() {
    setExporting(true);
    await new Promise(r => setTimeout(r, 500));
    try { await exportReportToPdf(previewRef, reportTitle); }
    catch (e) { console.error(e); }
    finally { setExporting(false); }
  }

  // Precompute chart data
  const intentPie = INTENT_ORDER.map(k => ({ name: intentMeta(k).label, value: enriched?.by_intent.find(i => i.key === k)?.count ?? 0, hex: intentMeta(k).hex })).filter(d => d.value > 0);
  const actionPie = ACTION_ORDER.map(k => ({ name: actionMeta(k).label, value: enriched?.by_action.find(a => a.key === k)?.count ?? 0, hex: actionMeta(k).hex })).filter(d => d.value > 0);
  const expBar    = EXP_ORDER.map(k => ({ name: experienceMeta(k).label, value: enriched?.by_experience.find(e => e.key === k)?.count ?? 0, hex: experienceMeta(k).hex })).filter(d => d.value > 0);
  const expTotal  = expBar.reduce((s, x) => s + x.value, 0);
  const langData  = enriched?.by_language ?? [];
  const deptData  = (enriched?.by_department ?? []).slice(0, 10).map(d => ({ name: deptMeta(d.dept).label, count: d.count, hex: deptMeta(d.dept).hex }));
  const criticalAlerts = stats?.by_barri?.filter(b => (b.avg_sentiment ?? 10) < 3.5).slice(0, 6) ?? [];
  const activeSectionCount = Object.values(sections).filter(Boolean).length;

  return (
    <div className="space-y-6">

      {/* ── Builder controls ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Config panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Configuració
            </CardTitle>
          </CardHeader>

          <div className="space-y-5">
            {/* General */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground-1 mb-1 block">Títol de l'informe</label>
                <input value={reportTitle} onChange={e => setReportTitle(e.target.value)}
                  className="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground-1 mb-1 block">Departament / Autor</label>
                <input value={reportAuthor} onChange={e => setReportAuthor(e.target.value)}
                  className="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground-1 mb-1 block">Color d'accent</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                    className="h-8 w-14 rounded cursor-pointer border border-card-line" />
                  <span className="text-xs text-muted-foreground-2 font-mono">{accentColor}</span>
                </div>
              </div>
            </div>

            {/* Presets */}
            <div>
              <p className="text-xs font-medium text-muted-foreground-1 mb-2">Plantilla ràpida</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[['executiu', 'Executiu'], ['operatiu', 'Operatiu'], ['complet', 'Complet']].map(([k, label]) => (
                  <button key={k} onClick={() => applyPreset(k)}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${activePreset === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-layer border-layer-line text-muted-foreground-1 hover:bg-layer-hover'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section toggles grouped */}
            <div className="space-y-4">
              {SECTION_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground-2 mb-2">{group.label}</p>
                  <div className="space-y-1.5">
                    {group.keys.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={sections[key]} onChange={() => toggle(key)} className="rounded accent-primary" />
                        <span className="text-xs text-muted-foreground-1 group-hover:text-foreground transition-colors">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="border-t border-card-line pt-4 space-y-2">
              <Button variant="outline" size="sm" className="w-full" icon={<Sparkles className="w-4 h-4" />}
                onClick={generateAISummary} loading={generatingAI}>
                Generar resum executiu
              </Button>
              <Button variant="primary" size="sm" className="w-full" icon={<Download className="w-4 h-4" />}
                onClick={handleExport} loading={exporting}>
                Exportar PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* Preview summary */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Resum del període</CardTitle></CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total missatges',    value: stats?.total?.toLocaleString('ca-ES') ?? '—' },
              { label: 'Sentiment mitjà',    value: stats?.avg_sentiment?.toFixed(2) ?? '—' },
              { label: 'Alertes crítiques',  value: stats?.critical_count?.toLocaleString('ca-ES') ?? '—' },
              { label: 'Seguiment pendent',  value: enriched ? `${enriched.followup_pct.toFixed(0)}%` : '—' },
              { label: 'Barris actius',      value: stats?.by_barri?.length?.toLocaleString('ca-ES') ?? '—' },
              { label: 'Departaments',       value: String(enriched?.by_department?.length ?? '—') },
              { label: 'Tendències',         value: String(insights.length) },
              { label: 'Seccions actives',   value: String(activeSectionCount) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-background-1 rounded-xl p-3 text-center border border-card-line">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-lg font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>
          {aiSummary && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary">Resum executiu</span>
              </div>
              <p className="text-sm text-muted-foreground-1 leading-relaxed">{aiSummary}</p>
            </div>
          )}
        </Card>
      </div>

      {/* ── PDF capture target (off-screen) ── */}
      <div ref={previewRef} className="bg-white" style={{ width: '794px', padding: '40px', fontFamily: 'system-ui,sans-serif' }}>

        {/* Header */}
        <div style={{ borderBottom: `2px solid ${accentColor}`, paddingBottom: '14px', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '11px' }}>SAC</span>
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{reportTitle}</h1>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>{reportAuthor} · Servei d'Atenció Ciutadana</p>
            </div>
          </div>
          <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '8px', margin: '6px 0 0' }}>
            Període: {format(from, 'dd/MM/yyyy', { locale: ca })} – {format(to, 'dd/MM/yyyy', { locale: ca })}
            {' '}· Generat: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ca })}
          </p>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '22px' }}>
          {[
            { label: 'Total missatges',   value: stats?.total?.toLocaleString('ca-ES') ?? '—' },
            { label: 'Sentiment mitjà',   value: stats?.avg_sentiment?.toFixed(2) ?? '—' },
            { label: 'Alertes crítiques', value: stats?.critical_count?.toLocaleString('ca-ES') ?? '—' },
            { label: 'Seguiment pendent', value: enriched ? `${enriched.followup_pct.toFixed(0)}% (${enriched.followup_count.toLocaleString('ca-ES')})` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f8f9fb', borderRadius: '10px', padding: '10px 12px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 3px' }}>{label}</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* AI summary */}
        {aiSummary && (
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px', padding: '12px 14px', marginBottom: '22px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: accentColor, margin: '0 0 5px' }}>Resum executiu</p>
            <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6, margin: 0 }}>{aiSummary}</p>
          </div>
        )}

        {/* Timeline */}
        {sections.timeline && (
          <div style={SEC}><h2 style={H2}>Evolució temporal</h2>
            <TimelineChart data={timeline} loading={timelineLoading} granularity={granularity} height={180} showSentiment={false} />
          </div>
        )}

        {/* Sentiment */}
        {sections.sentiment && (
          <div style={SEC}><h2 style={H2}>Distribució de sentiment</h2>
            <SentimentHistogram data={stats?.sentiment_distribution ?? []} loading={statsLoading} height={180} />
          </div>
        )}

        {/* Categories */}
        {sections.categories && (
          <div style={SEC}><h2 style={H2}>Categories principals</h2>
            <CategoryBarChart data={stats?.by_clas1 ?? []} loading={statsLoading} height={220} maxItems={8} />
          </div>
        )}

        {/* Channels */}
        {sections.channels && (
          <div style={SEC}><h2 style={H2}>Missatges per canal</h2>
            <ChannelPieChart data={stats?.by_canal ?? []} loading={statsLoading} height={200} />
          </div>
        )}

        {/* Neighborhoods */}
        {sections.neighborhoods && (
          <div style={SEC}><h2 style={H2}>Missatges per barri</h2>
            <NeighborhoodBarChart data={stats?.by_barri ?? []} loading={statsLoading} height={260} />
          </div>
        )}

        {/* Intent */}
        {sections.intent && intentPie.length > 0 && (
          <div style={SEC}><h2 style={H2}>Distribució per intenció</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <PieChart width={200} height={170}>
                <Pie data={intentPie} cx={100} cy={85} innerRadius={42} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {intentPie.map((d, i) => <Cell key={i} fill={d.hex} />)}
                </Pie>
                <Tooltip formatter={(v: number, _: unknown, props: { payload?: { name?: string } }) => [v.toLocaleString('ca-ES'), props.payload?.name ?? '']} />
              </PieChart>
              <div style={{ flex: 1 }}>
                {intentPie.map(d => {
                  const tot = intentPie.reduce((s, x) => s + x.value, 0);
                  return (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.hex, flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', color: '#374151', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#111827' }}>{d.value.toLocaleString('ca-ES')}</span>
                      <span style={{ fontSize: '10px', color: '#9ca3af' }}>({(d.value / tot * 100).toFixed(0)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Departments */}
        {sections.departments && deptData.length > 0 && (
          <div style={SEC}><h2 style={H2}>Missatges per departament</h2>
            <BarChart width={714} height={Math.max(180, deptData.length * 22 + 20)} data={deptData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [v.toLocaleString('ca-ES'), 'Missatges']} contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                {deptData.map((d, i) => <Cell key={i} fill={d.hex} />)}
              </Bar>
            </BarChart>
          </div>
        )}

        {/* Actions */}
        {sections.actions && actionPie.length > 0 && (
          <div style={SEC}><h2 style={H2}>Acció requerida</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <PieChart width={180} height={150}>
                <Pie data={actionPie} cx={90} cy={75} innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}>
                  {actionPie.map((d, i) => <Cell key={i} fill={d.hex} />)}
                </Pie>
              </PieChart>
              <div style={{ flex: 1 }}>
                {actionPie.map(d => {
                  const tot = actionPie.reduce((s, x) => s + x.value, 0);
                  return (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.hex, flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', color: '#374151', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#111827' }}>{d.value.toLocaleString('ca-ES')} ({(d.value / tot * 100).toFixed(0)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Experience */}
        {sections.experience && expBar.length > 0 && (
          <div style={SEC}><h2 style={H2}>Experiència ciutadana</h2>
            {expBar.map(d => {
              const pct = expTotal > 0 ? (d.value / expTotal) * 100 : 0;
              return (
                <div key={d.name} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>{d.name}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{d.value.toLocaleString('ca-ES')} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: d.hex, borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Language */}
        {sections.language && langData.length > 0 && (
          <div style={SEC}><h2 style={H2}>Distribució per idioma</h2>
            {langData.map(l => {
              const m = languageMeta(l.key);
              return (
                <div key={l.key} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>{m.label}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{l.count.toLocaleString('ca-ES')} ({l.pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${l.pct}%`, backgroundColor: m.hex, borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Followup */}
        {sections.followup && enriched && (
          <div style={SEC}><h2 style={H2}>Seguiment pendent</h2>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ textAlign: 'center', minWidth: '90px' }}>
                <p style={{ fontSize: '34px', fontWeight: 700, color: '#ef4444', margin: 0 }}>{enriched.followup_pct.toFixed(0)}%</p>
                <p style={{ fontSize: '10px', color: '#6b7280', margin: '2px 0 0' }}>del total</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '6px 0 0' }}>{enriched.followup_count.toLocaleString('ca-ES')}</p>
                <p style={{ fontSize: '10px', color: '#6b7280', margin: '1px 0 0' }}>missatges</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>Per departament:</p>
                {(enriched.by_department ?? []).slice(0, 6).map(d => (
                  <div key={d.dept} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '11px', color: '#374151', flex: 1 }}>{deptMeta(d.dept).label}</span>
                    <div style={{ width: '120px', height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${d.followup_pct}%`, backgroundColor: d.followup_pct > 70 ? '#ef4444' : d.followup_pct > 50 ? '#f97316' : '#10b981', borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: d.followup_pct > 70 ? '#ef4444' : d.followup_pct > 50 ? '#f97316' : '#10b981', width: '32px', textAlign: 'right' }}>{d.followup_pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {sections.alerts && criticalAlerts.length > 0 && (
          <div style={SEC}><h2 style={H2}>Barris amb alertes crítiques</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Barri', 'Missatges', 'Sent. mitjà', 'Crítics'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Barri' ? 'left' : 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criticalAlerts.map(b => (
                  <tr key={b.barri} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px 10px', color: '#111827' }}>{b.barri}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#374151' }}>{b.count}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>{b.avg_sentiment?.toFixed(2)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#f97316', fontWeight: 600 }}>{b.critical_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Trends */}
        {sections.trends && insights.length > 0 && (
          <div style={SEC}><h2 style={H2}>Tendències detectades ({insights.length})</h2>
            {insights.map(ins => (
              <div key={ins.id} style={{ borderLeft: `3px solid ${SEVERITY_COLOR[ins.severity]}`, paddingLeft: '11px', marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#111827', margin: '0 0 3px' }}>{ins.title}</p>
                <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{ins.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>SAC Dashboard · {reportAuthor}</p>
          <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>Document generat automàticament · {activeSectionCount} seccions</p>
        </div>
      </div>

      <div className="bg-card border border-card-line rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <strong>{activeSectionCount}</strong> seccions seleccionades · Fes clic a <strong>Exportar PDF</strong> per descarregar l'informe.
        </p>
      </div>
    </div>
  );
}
