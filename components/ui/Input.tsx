import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-muted-foreground-1">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground-2">{icon}</div>
        )}
        <input
          {...props}
          className={cn(
            'w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-foreground',
            'placeholder:text-muted-foreground-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
            'disabled:bg-muted-hover disabled:text-muted-foreground-2',
            icon && 'pl-9',
            error && 'border-red-400',
            className
          )}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
