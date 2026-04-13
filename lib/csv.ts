import type { SacMessage } from '@/types';
import { formatDate } from './utils';
import { parseSentiment, sentimentLabel } from './sentiment';

const HEADERS = [
  'ID', 'Referència', 'Data', 'Barri', 'Canal', 'Categoria',
  'Subcategoria', 'Sentiment', 'Urgència', 'Missatge',
];

function escapeCell(val: string | null | undefined): string {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function messagesToCsv(rows: SacMessage[]): string {
  const lines: string[] = [HEADERS.join(',')];
  for (const row of rows) {
    const sentiment = parseSentiment(row.sentiment);
    lines.push([
      escapeCell(String(row.id)),
      escapeCell(row.saved_id),
      escapeCell(formatDate(row.data_inici)),
      escapeCell(row.barri),
      escapeCell(row.canal),
      escapeCell(row.clas1),
      escapeCell(row.clas2),
      escapeCell(sentiment !== null ? `${sentiment} (${sentimentLabel(sentiment)})` : null),
      escapeCell(row.situation),
      escapeCell(row.message),
    ].join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
