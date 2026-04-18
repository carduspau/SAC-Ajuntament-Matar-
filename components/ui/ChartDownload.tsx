'use client';

import { ImageDown, FileDown } from 'lucide-react';

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
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onPng(); }}
        title="Descarregar PNG"
        className="p-1 rounded hover:bg-muted-hover text-muted-foreground-2 hover:text-muted-foreground transition-colors"
      >
        <ImageDown className="w-3.5 h-3.5" />
      </button>
      {onCsv && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onCsv(); }}
          title="Descarregar CSV"
          className="p-1 rounded hover:bg-muted-hover text-muted-foreground-2 hover:text-muted-foreground transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
