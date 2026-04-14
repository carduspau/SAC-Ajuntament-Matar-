'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { SentimentBadge, CanalBadge } from '@/components/ui/Badge';
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
          <Row label="Ciutadà" value={message.ciutada} />
          {message.lat && message.lng && (
            <Row label="Coordenades" value={`${message.lat?.toFixed(5)}, ${message.lng?.toFixed(5)}`} />
          )}
        </dl>
      </div>
    </Modal>
  );
}
