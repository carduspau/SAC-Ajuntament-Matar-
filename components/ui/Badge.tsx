import React from 'react';
import { cn } from '@/lib/utils';
import { parseSentiment, sentimentBgColor, sentimentLabel } from '@/lib/sentiment';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-indigo-100 text-indigo-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-600',
};

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function SentimentBadge({ value }: { value: string | null | undefined }) {
  const score = parseSentiment(value);
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', sentimentBgColor(score))}>
      {score !== null ? score.toFixed(1) : '—'} · {sentimentLabel(score)}
    </span>
  );
}

export function CanalBadge({ canal }: { canal: string | null | undefined }) {
  const CANAL_COLORS: Record<string, string> = {
    'Web municipal': 'bg-blue-100 text-blue-700',
    'Telèfon del civisme': 'bg-green-100 text-green-700',
    'Fotodenuncia': 'bg-orange-100 text-orange-700',
    'App': 'bg-purple-100 text-purple-700',
  };
  const cls = canal ? (CANAL_COLORS[canal] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-600';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', cls)}>
      {canal ?? '—'}
    </span>
  );
}
