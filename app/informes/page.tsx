'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, RefreshCw, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { SentimentHistogram } from '@/components/charts/SentimentHistogram';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { ChannelPieChart } from '@/components/charts/ChannelPieChart';
import { NeighborhoodBarChart } from '@/components/charts/NeighborhoodBarChart';
import { useStats } from '@/hooks/useStats';
import { useTimeline } from '@/hooks/useTimeline';
import { useDateRange } from '@/context/DateRangeContext';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { exportReportToPdf } from '@/lib/pdf';

interface SectionConfig {
  timeline: boolean;
  sentiment: boolean;
  categories: boolean;
  channels: boolean;
  neighborhoods: boolean;
  alerts: boolean;
}

export default function InformesPage() {
  const { from, to, granularity } = useDateRange();
  const { data: stats, loading: statsLoading } = useStats();
  const { data: timeline, loading: timelineLoading } = useTimeline();
  const previewRef = useRef<HTMLDivElement>(null);

  const [sections, setSections] = useState<SectionConfig>({
    timeline: true, sentiment: true, categories: true,
    channels: true, neighborhoods: true, alerts: true,
  });
  const [aiSummary, setAiSummary] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportTitle, setReportTitle] = useState('Informe SAC');

  function toggleSection(key: keyof SectionConfig) {
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
          messages: [{
            role: 'user',
            content: `Genera un resum executiu breu (màxim 200 paraules) en català per a un informe del SAC. El període és ${format(from, 'dd/MM/yyyy', { locale: ca })} - ${format(to, 'dd/MM/yyyy', { locale: ca })}. Inclou: principals observacions, alertes importants, i 2-3 recomanacions concretes. Format: text net sense markdown.`,
          }],
          filters: { from: from.toISOString(), to: to.toISOString() },
          apiKey: apiKey || undefined,
        }),
      });
      const data = await res.json();
      setAiSummary(data.content ?? '');
    } catch {
      setAiSummary('No s\'ha pogut generar el resum.');
    } finally {
      setGeneratingAI(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    // Wait for any animations/renders to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await exportReportToPdf(previewRef, reportTitle);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setExporting(false);
    }
  }

  const SECTION_LABELS: Record<keyof SectionConfig, string> = {
    timeline: 'Evolució temporal',
    sentiment: 'Distribució de sentiment',
    categories: 'Categories principals',
    channels: 'Canals',
    neighborhoods: 'Per barri',
    alerts: 'Alertes crítiques',
  };

  const criticalAlerts = stats?.by_barri
    ?.filter(b => (b.avg_sentiment ?? 10) < 3.5)
    .slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      {/* Builder controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Configuració
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Títol de l'informe</label>
              <input
                value={reportTitle}
                onChange={e => setReportTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Seccions a incloure</p>
              <div className="space-y-2">
                {(Object.keys(sections) as (keyof SectionConfig)[]).map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sections[key]}
                      onChange={() => toggleSection(key)}
                      className="rounded accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{SECTION_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={generateAISummary}
                loading={generatingAI}
              >
                Generar resum IA
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                icon={<Download className="w-4 h-4" />}
                onClick={handleExport}
                loading={exporting}
              >
                Exportar PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* Period summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resum del període</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total missatges', value: stats?.total?.toLocaleString('ca-ES') ?? '—' },
              { label: 'Sentiment mitjà', value: stats?.avg_sentiment?.toFixed(2) ?? '—' },
              { label: 'Alertes crítiques', value: stats?.critical_count?.toLocaleString('ca-ES') ?? '—' },
              { label: 'Barris actius', value: stats?.by_barri?.length?.toLocaleString('ca-ES') ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
          {aiSummary && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Resum generat per IA</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{aiSummary}</p>
            </div>
          )}
        </Card>
      </div>

      {/* PDF Preview (off-screen capture target) */}
      <div ref={previewRef} className="bg-white" style={{ width: '794px', padding: '40px', fontFamily: 'system-ui,sans-serif' }}>
        {/* Report header */}
        <div style={{ borderBottom: '2px solid #4f46e5', paddingBottom: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>SAC</span>
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>{reportTitle}</h1>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
                Ajuntament de Mataró · Servei d'Atenció Ciutadana
              </p>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
            Període: {format(from, 'dd/MM/yyyy', { locale: ca })} – {format(to, 'dd/MM/yyyy', { locale: ca })}
            {' '}· Generat: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ca })}
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total missatges', value: stats?.total?.toLocaleString('ca-ES') ?? '—' },
            { label: 'Sentiment mitjà', value: stats?.avg_sentiment?.toFixed(2) ?? '—' },
            { label: 'Alertes crítiques', value: stats?.critical_count?.toLocaleString('ca-ES') ?? '—' },
            { label: 'Barris actius', value: stats?.by_barri?.length?.toLocaleString('ca-ES') ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f8f9fb', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{label}</p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#4f46e5', marginBottom: '8px' }}>Resum executiu (IA)</p>
            <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{aiSummary}</p>
          </div>
        )}

        {/* Sections */}
        {sections.timeline && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px' }}>Evolució temporal</h2>
            <TimelineChart data={timeline} loading={timelineLoading} granularity={granularity} height={200} showSentiment={false} />
          </div>
        )}

        {sections.sentiment && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px' }}>Distribució de sentiment</h2>
            <SentimentHistogram data={stats?.sentiment_distribution ?? []} loading={statsLoading} height={200} />
          </div>
        )}

        {sections.categories && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px' }}>Categories principals</h2>
            <CategoryBarChart data={stats?.by_clas1 ?? []} loading={statsLoading} height={250} maxItems={8} />
          </div>
        )}

        {sections.channels && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px' }}>Missatges per canal</h2>
            <ChannelPieChart data={stats?.by_canal ?? []} loading={statsLoading} height={220} />
          </div>
        )}

        {sections.neighborhoods && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px' }}>Per barri</h2>
            <NeighborhoodBarChart data={stats?.by_barri ?? []} loading={statsLoading} height={280} />
          </div>
        )}

        {sections.alerts && criticalAlerts.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px' }}>Barris amb alertes crítiques</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Barri</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Missatges</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Sent. mitjà</th>
                </tr>
              </thead>
              <tbody>
                {criticalAlerts.map(b => (
                  <tr key={b.barri} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px 12px', color: '#111827' }}>{b.barri}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#374151' }}>{b.count}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>{b.avg_sentiment?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '10px', color: '#9ca3af' }}>SAC Dashboard · Ajuntament de Mataró</p>
          <p style={{ fontSize: '10px', color: '#9ca3af' }}>Document generat automàticament</p>
        </div>
      </div>

      {/* Live preview indicator */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500">La previsualització s'usa per generar el PDF. Fes clic a <strong>Exportar PDF</strong> per descarregar l'informe.</p>
      </div>
    </div>
  );
}
