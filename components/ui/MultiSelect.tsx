'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  label?: string;
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
}

export function MultiSelect({ label, placeholder, options, selected, onChange, searchable }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setSearch(''); return; }
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const showSearch = searchable !== false && options.length > 7;
  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const triggerLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label ?? selected[0])
      : `${selected.length} seleccionats`;

  return (
    <div ref={wrapperRef} className="relative flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-muted-foreground-1">{label}</label>}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center justify-between w-full rounded-lg border bg-select px-3 py-2 text-sm text-left transition-colors',
          open ? 'border-primary ring-2 ring-primary/10' : 'border-select-line',
          selected.length === 0 ? 'text-muted-foreground-2' : 'text-foreground'
        )}
      >
        <span className="truncate flex-1 min-w-0">{triggerLabel}</span>
        <ChevronDown className={cn(
          'w-4 h-4 text-muted-foreground-2 shrink-0 ml-1 transition-transform duration-150',
          open && 'rotate-180'
        )} />
      </button>

      {/* Selected tags (when > 1 item) */}
      {selected.length > 1 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {selected.map(v => {
            const lbl = options.find(o => o.value === v)?.label ?? v;
            const short = lbl.length > 22 ? lbl.slice(0, 22) + '…' : lbl;
            return (
              <span key={v} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                <span>{short}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); toggle(v); }}
                  className="hover:text-primary-hover"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-card-line rounded-xl shadow-xl w-full min-w-[200px] overflow-hidden">
          {showSearch && (
            <div className="p-2 border-b border-card-line">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cercar..."
                onClick={e => e.stopPropagation()}
                className="w-full rounded-lg border border-layer-line bg-layer px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground-2 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted-foreground-2 text-center">Cap resultat</div>
            ) : (
              filtered.map(opt => {
                const isSelected = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                      isSelected ? 'bg-primary/5 text-foreground' : 'text-foreground hover:bg-muted-hover'
                    )}
                  >
                    <span className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      isSelected ? 'bg-primary border-primary' : 'border-layer-line bg-layer'
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
