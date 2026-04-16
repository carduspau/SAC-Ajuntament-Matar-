import React from 'react';
import { cn } from '@/lib/utils';
import { parseSentiment, sentimentBgColor, sentimentLabel } from '@/lib/sentiment';
import { intentMeta, deptMeta, actionMeta, experienceMeta, languageMeta } from '@/lib/intentColors';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-blue-100 text-blue-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
  neutral: 'bg-surface text-muted-foreground-1',
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
  const cls = canal ? (CANAL_COLORS[canal] ?? 'bg-surface text-muted-foreground-1') : 'bg-surface text-muted-foreground-1';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', cls)}>
      {canal ?? '—'}
    </span>
  );
}

export function IntentBadge({ intent }: { intent: string | null | undefined }) {
  const m = intentMeta(intent ?? null);
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', m.bg, m.text)}>
      {m.label}
    </span>
  );
}

export function DeptBadge({ dept }: { dept: string | null | undefined }) {
  const m = deptMeta(dept ?? null);
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', m.bg, m.text)}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: m.hex }} />
      {m.label}
    </span>
  );
}

export function ActionBadge({ action }: { action: string | null | undefined }) {
  const m = actionMeta(action ?? null);
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', m.bg, m.text)}>
      {m.label}
    </span>
  );
}

export function ExperienceBadge({ signal }: { signal: string | null | undefined }) {
  const m = experienceMeta(signal ?? null);
  const icons: Record<string, string> = {
    'primera_interacció': '👤',
    'reincident_satisfet': '✓',
    'reincident_frustrat': '⚠',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', m.bg, m.text)}>
      <span>{icons[signal ?? ''] ?? ''}</span>
      {m.label}
    </span>
  );
}

export function LanguageBadge({ lang }: { lang: string | null | undefined }) {
  const m = languageMeta(lang ?? null);
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', m.bg, m.text)}>
      {m.label}
    </span>
  );
}
