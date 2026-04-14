import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, options, placeholder, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-muted-foreground-1">{label}</label>}
      <div className="relative">
        <select
          {...props}
          className={cn(
            'w-full appearance-none rounded-lg border border-select-line bg-select px-3 py-2 pr-9 text-sm text-foreground',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
            'disabled:bg-muted-hover disabled:text-muted-foreground-2',
            className
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground-2 pointer-events-none" />
      </div>
    </div>
  );
}
