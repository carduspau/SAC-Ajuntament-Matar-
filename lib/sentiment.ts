export function parseSentiment(val: string | null | undefined): number | null {
  if (!val) return null;
  const normalized = val.trim().replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? null : Math.max(0, Math.min(10, n));
}

export function sentimentColor(score: number | null): string {
  if (score === null) return '#9ca3af'; // gray-400
  if (score < 3) return '#ef4444';   // red-500
  if (score < 5) return '#f59e0b';   // amber-500
  if (score < 7) return '#6366f1';   // indigo-500
  return '#10b981';                  // emerald-500
}

export function sentimentBgColor(score: number | null): string {
  if (score === null) return 'bg-gray-100 text-gray-600';
  if (score < 3) return 'bg-red-100 text-red-700';
  if (score < 5) return 'bg-amber-100 text-amber-700';
  if (score < 7) return 'bg-indigo-100 text-indigo-700';
  return 'bg-emerald-100 text-emerald-700';
}

export function sentimentLabel(score: number | null): string {
  if (score === null) return 'Desconegut';
  if (score < 3) return 'Crític';
  if (score < 5) return 'Negatiu';
  if (score < 7) return 'Neutral';
  return 'Positiu';
}

export function sentimentMapColor(score: number | null, alpha = 0.7): string {
  if (score === null) return `rgba(156,163,175,${alpha})`;
  if (score < 3) return `rgba(239,68,68,${alpha})`;
  if (score < 5) return `rgba(245,158,11,${alpha})`;
  if (score < 7) return `rgba(99,102,241,${alpha})`;
  return `rgba(16,185,129,${alpha})`;
}

export function countToMapColor(count: number, maxCount: number, alpha = 0.75): string {
  if (maxCount === 0) return `rgba(229,231,235,${alpha})`;
  const intensity = Math.min(count / maxCount, 1);
  // Blue sequential scale
  const r = Math.round(239 - intensity * 200);
  const g = Math.round(246 - intensity * 200);
  const b = Math.round(255);
  return `rgba(${r},${g},${b},${alpha})`;
}
