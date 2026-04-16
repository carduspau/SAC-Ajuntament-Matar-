'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { ClipboardList, AlertOctagon, UserX, Wrench } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { IntentBadge, DeptBadge, ActionBadge, ExperienceBadge } from '@/components/ui/Badge';
import { MessageDetail } from '@/components/missatges/MessageDetail';
import { supabase } from '@/lib/supabase';
import { parseSentiment } from '@/lib/sentiment';
import { formatDate, truncate, cn } from '@/lib/utils';
import { useEnrichedStats } from '@/hooks/useEnrichedStats';
import { ACTION_META, DEPT_META, actionMeta, deptMeta } from '@/lib/intentColors';
import { useDateRange } from '@/context/DateRangeContext';
import type { SacMessage } from '@/types';

const ACTION_URGENCY = ['desplaçament_físic', 'reparar', 'investigar', 'derivar', 'informar', 'cap'];
const REND_ACTIONS = ACTION_URGENCY.filter(a => a !== 'cap');

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub: string; color: string;
}) {
  return (
    <div className="bg-card border border-card-line rounded-2xl p-5 shadow-xs flex gap-4 items-start">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground-2">{label}</p>
        <p className="text-2xl font-extrabold tracking-tight text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground-2">{sub}</p>
      </div>
    </div>
  );
}

export default function GestioPage() {
  const { from, to } = useDateRange();
  const { data: enriched, loading: enrichedLoading } = useEnrichedStats();
  const [messages, setMessages] = useState<SacMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<SacMessage | null>(null);

  const fetchMessages = useCallback(async () => {
    setMsgLoading(true);
    try {
      const { data } = await supabase
        .from('sac_messages')
        .select('id,saved_id,message,barri,canal,data_inici,sentiment,intent,department,action_required,followup_needed,citizen_experience_signal,clas1,situation,clas2,clas3,ciutada,lat,lng,language,location_extracted')
        .eq('followup_needed', true)
        .gte('data_inici', from.toISOString())
        .lte('data_inici', to.toISOString())
        .order('sentiment', { ascending: true, nullsFirst: false })
        .limit(500);
      setMessages((data ?? []) as SacMessage[]);
    } catch {
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }, [from.toISOString(), to.toISOString()]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const reincidentFrustrats = enriched?.by_experience.find(e => e.key === 'reincident_frustrat')?.count ?? 0;
  const urgentCount = messages.filter(m => m.action_required === 'desplaçament_físic' || m.action_required === 'reparar').length;

  // Action donut data (all followup messages)
  const actionDonut = REND_ACTIONS.map(a => ({
    name: actionMeta(a).label,
    value: messages.filter(m => m.action_required === a).length,
    hex: ACTION_META[a]?.hex ?? '#94a3b8',
  })).filter(d => d.value > 0);

  // Followup by dept bar
  const followupByDept = (enriched?.by_department ?? [])
    .map(d => ({ name: deptMeta(d.dept).label, count: d.followup_count, pct: d.followup_pct, hex: deptMeta(d.dept).hex }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const loading = enrichedLoading || msgLoading;

  // Filtered messages
  const deptOptions = [...new Set(messages.map(m => m.department).filter(Boolean))] as string[];
  const filtered = messages.filter(m =>
    (!filterDept   || m.department === filterDept) &&
    (!filterAction || m.action_required === filterAction)
  );

  return (
    <div className="space-y-6">

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard icon={ClipboardList} label="Seguiment pendent" value={enriched?.followup_count.toLocaleString('ca-ES') ?? '—'}
            sub={`${enriched?.followup_pct.toFixed(0) ?? 0}% del total del període`} color="#ef4444" />
          <KpiCard icon={UserX} label="Reincidents frustrats" value={reincidentFrustrats.toLocaleString('ca-ES')}
            sub="necessiten atenció prioritària" color="#ec4899" />
          <KpiCard icon={Wrench} label="Acció urgent" value={urgentCount.toLocaleString('ca-ES')}
            sub="reparació o desplaçament físic" color="#f97316" />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Action required donut */}
        <Card>
          <CardHeader><CardTitle>Acció requerida (seguiments pendents)</CardTitle></CardHeader>
          {loading ? <Skeleton className="h-60 w-full" /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={actionDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    dataKey="value" paddingAngle={2}>
                    {actionDonut.map((d, i) => <Cell key={i} fill={d.hex} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v.toLocaleString('ca-ES'), 'Missatges']}
                    contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {actionDonut.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.hex }} />
                    <span className="text-muted-foreground-1 flex-1">{d.name}</span>
                    <span className="font-semibold text-foreground">{d.value.toLocaleString('ca-ES')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Followup by department */}
        <Card>
          <CardHeader><CardTitle>Seguiments per departament</CardTitle></CardHeader>
          {loading ? <Skeleton className="h-60 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={followupByDept} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [v.toLocaleString('ca-ES'), 'Seguiments']}
                  contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                  {followupByDept.map((d, i) => <Cell key={i} fill={d.hex} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Filterable table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3 w-full">
            <CardTitle className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-500" />
              Missatges pendents de seguiment
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="text-xs border border-card-line rounded-lg px-2.5 py-1.5 bg-layer text-foreground"
              >
                <option value="">Tots els departaments</option>
                {deptOptions.map(d => <option key={d} value={d}>{deptMeta(d).label}</option>)}
              </select>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="text-xs border border-card-line rounded-lg px-2.5 py-1.5 bg-layer text-foreground"
              >
                <option value="">Totes les accions</option>
                {REND_ACTIONS.map(a => <option key={a} value={a}>{actionMeta(a).label}</option>)}
              </select>
              <span className="text-xs text-muted-foreground">{filtered.length} missatges</span>
            </div>
          </div>
        </CardHeader>

        {msgLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground-2 text-center py-10">No hi ha missatges amb aquests filtres</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-card-line">
                  {['Sent.', 'Barri', 'Intent', 'Departament', 'Acció', 'Experiència', 'Missatge', 'Data'].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-xs font-medium text-muted-foreground-2 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-card-line">
                {filtered.slice(0, 100).map(m => {
                  const score = parseSentiment(m.sentiment);
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-muted-hover cursor-pointer transition-colors"
                      onClick={() => setSelectedMessage(m)}
                    >
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span className={cn('font-bold text-xs', score !== null && score < 3.5 ? 'text-red-600' : 'text-amber-600')}>
                          {score?.toFixed(1) ?? '—'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground-1 whitespace-nowrap max-w-[100px] truncate">{m.barri ?? '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap"><IntentBadge intent={m.intent} /></td>
                      <td className="py-2 px-2 whitespace-nowrap"><DeptBadge dept={m.department} /></td>
                      <td className="py-2 px-2 whitespace-nowrap"><ActionBadge action={m.action_required} /></td>
                      <td className="py-2 px-2 whitespace-nowrap"><ExperienceBadge signal={m.citizen_experience_signal} /></td>
                      <td className="py-2 px-2 text-xs text-muted-foreground-1 max-w-[220px] truncate">{truncate(m.message, 60)}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground-2 whitespace-nowrap">{formatDate(m.data_inici, 'dd/MM/yy')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p className="text-xs text-muted-foreground-2 text-center py-3">Mostrant 100 de {filtered.length} missatges</p>
            )}
          </div>
        )}
      </Card>

      <MessageDetail message={selectedMessage} onClose={() => setSelectedMessage(null)} />
    </div>
  );
}
