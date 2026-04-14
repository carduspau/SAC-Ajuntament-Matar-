import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: number; // percentage change
  variant?: 'default' | 'danger' | 'warning' | 'success';
  loading?: boolean;
  onClick?: () => void;
}

const VARIANT_CLASSES = {
  default: 'border-slate-200',
  danger: 'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  success: 'border-emerald-200 bg-emerald-50',
};

const ICON_CLASSES = {
  default: 'bg-blue-100 text-blue-600',
  danger: 'bg-red-100 text-red-600',
  warning: 'bg-amber-100 text-amber-600',
  success: 'bg-emerald-100 text-emerald-600',
};

export function KpiCard({ label, value, sub, icon, trend, variant = 'default', loading, onClick }: KpiCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl border p-5 flex flex-col gap-3',
        VARIANT_CLASSES[variant],
        onClick && 'cursor-pointer hover:shadow-card-hover transition-shadow'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {icon && (
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', ICON_CLASSES[variant])}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={cn('text-xs font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-600')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs. període anterior
        </div>
      )}
    </div>
  );
}
