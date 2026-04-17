'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { SentimentBadge, CanalBadge, IntentBadge, DeptBadge, ActionBadge, ExperienceBadge, LanguageBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { parseSentiment } from '@/lib/sentiment';
import type { SacMessage } from '@/types';

interface Props {
  message: SacMessage | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2 border-b border-card-line">
      <dt className="text-xs font-medium text-muted-foreground w-28 shrink-0">{label}</dt>
      <dd className="text-sm text-foreground flex-1">{value ?? '—'}</dd>
    </div>
  );
}

export function MessageDetail({ message, onClose }: Props) {
  if (!message) return null;

  return (
    <Modal open={!!message} onClose={onClose} title={`Missatge ${message.saved_id}`} size="lg">
      <div className="p-6 space-y-4">
        {/* Message text */}
        <div className="bg-background-1 rounded-xl p-4">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{message.message || '—'}</p>
        </div>

        {/* AI badges row */}
        {(message.intent || message.department || message.action_required || message.citizen_experience_signal || message.language) && (
          <div className="flex flex-wrap gap-1.5">
            {message.intent && <IntentBadge intent={message.intent} />}
            {message.department && <DeptBadge dept={message.department} />}
            {message.action_required && <ActionBadge action={message.action_required} />}
            {message.citizen_experience_signal && <ExperienceBadge signal={message.citizen_experience_signal} />}
            {message.language && <LanguageBadge lang={message.language} />}
          </div>
        )}

        {/* Metadata */}
        <dl className="divide-y divide-card-line">
          <Row label="Referència" value={message.saved_id} />
          <Row label="Data" value={formatDate(message.data_inici)} />
          <Row label="Barri" value={message.barri} />
          <Row label="Canal" value={<CanalBadge canal={message.canal} />} />
          <Row label="Sentiment" value={<SentimentBadge value={message.sentiment} />} />
          <Row label="Urgència" value={message.situation} />
          <Row label="Categoria" value={message.clas1} />
          <Row label="Subcategoria" value={message.clas2} />
          {message.clas3 && <Row label="Sub-sub" value={message.clas3} />}
          <Row label="Intenció" value={message.intent ? <IntentBadge intent={message.intent} /> : null} />
          <Row label="Departament" value={message.department ? <DeptBadge dept={message.department} /> : null} />
          <Row label="Acció requerida" value={message.action_required ? <ActionBadge action={message.action_required} /> : null} />
          <Row label="Experiència" value={message.citizen_experience_signal ? <ExperienceBadge signal={message.citizen_experience_signal} /> : null} />
          <Row label="Idioma" value={message.language ? <LanguageBadge lang={message.language} /> : null} />
          <Row label="Seguiment" value={
            message.followup_needed === true ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Pendent</span>
            ) : message.followup_needed === false ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">No requerit</span>
            ) : null
          } />
          {message.location_extracted && <Row label="Ubicació" value={message.location_extracted} />}
          <Row label="Ciutadà" value={message.ciutada} />
          {message.lat && message.lng && (
            <Row label="Coordenades" value={`${message.lat?.toFixed(5)}, ${message.lng?.toFixed(5)}`} />
          )}
        </dl>
      </div>
    </Modal>
  );
}
