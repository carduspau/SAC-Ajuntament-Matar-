import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined, fmt = 'dd/MM/yyyy HH:mm'): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return format(d, fmt, { locale: ca });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | null | undefined): string {
  return formatDate(dateStr, 'dd/MM/yyyy');
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('ca-ES');
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export function truncate(str: string | null | undefined, len = 120): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function normalizeBarriName(name: string): string {
  return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      qs.set(key, String(value));
    }
  }
  return qs.toString();
}
