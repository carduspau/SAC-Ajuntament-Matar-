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
    <div className="flex gap-4 py-2 border-b border-gray-50">
      <dt className="text-xs font-medium text-gray-500 w-28 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 flex-1">{value ?? '—'}</dd>
    </div>
  );
}

export function MessageDetail({ message, onClose }: Props) {
  if (!message) return null;

  return (
    <Modal open={!!message} onClose={onClose} title={`Missatge ${message.saved_id}`} size="lg">
      <div className="p-6 space-y-4">
        {/* Message text */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{message.message || '—'}</p>
        </div>

        {/* Metadata */}
        <dl className="divide-y divide-gray-50">
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
