'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, ImageDown, FileDown } from 'lucide-react';

export function downloadCsv(filename: string, data: Record<string, unknown>[]) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = data.map(row => headers.map(h => escape(row[h])).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPng(element: HTMLElement, filename: string) {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    useCORS: true,
  });
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.png`;
  a.click();
}

interface ChartDownloadButtonsProps {
  onPng: () => void;
  onCsv?: () => void;
}

export function ChartDownloadButtons({ onPng, onCsv }: ChartDownloadButtonsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        title="Opcions de descàrrega"
        className="p-1 rounded hover:bg-muted-hover text-muted-foreground-2 hover:text-muted-foreground transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-card-line rounded-lg shadow-xs py-1 min-w-max">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setOpen(false); onPng(); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-foreground hover:bg-muted-hover transition-colors whitespace-nowrap"
          >
            <ImageDown className="w-3.5 h-3.5 text-muted-foreground-2" />
            Descarregar PNG
          </button>
          {onCsv && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setOpen(false); onCsv(); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-foreground hover:bg-muted-hover transition-colors whitespace-nowrap"
            >
              <FileDown className="w-3.5 h-3.5 text-muted-foreground-2" />
              Descarregar CSV
            </button>
          )}
        </div>
      )}
    </div>
  );
}
