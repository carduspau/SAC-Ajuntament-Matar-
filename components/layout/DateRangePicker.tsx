'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format, addMonths, subMonths,
  startOfMonth, getDaysInMonth, getDay,
  isSameDay, isBefore, isAfter, isToday,
  isWithinInterval, startOfDay,
} from 'date-fns';
import { ca } from 'date-fns/locale';
import { useDateRange } from '@/context/DateRangeContext';
import { cn } from '@/lib/utils';
import type { PeriodType } from '@/types';

const PERIODS: { value: PeriodType; label: string }[] = [
  { value: 'day', label: 'Avui' },
  { value: 'week', label: 'Setmana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Any' },
];

const WEEK_DAYS = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

export function DateRangePicker() {
  const { from, to, period, setPeriod, setCustomRange } = useDateRange();

  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!calOpen) return;
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setCalOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [calOpen]);

  function openCalendar() {
    setCalMonth(new Date(from));
    setTempStart(from);
    setTempEnd(to);
    setCalOpen(v => !v);
  }

  function handleDayClick(day: Date) {
    if (!tempStart || (tempStart && tempEnd)) {
      // Start new selection
      setTempStart(day);
      setTempEnd(null);
    } else {
      // Complete the range
      if (isBefore(day, tempStart)) {
        setTempEnd(tempStart);
        setTempStart(day);
      } else {
        setTempEnd(day);
      }
    }
  }

  function applyRange() {
    if (tempStart && tempEnd) {
      setCustomRange(startOfDay(tempStart), new Date(tempEnd.setHours(23, 59, 59, 999)));
      setCalOpen(false);
    }
  }

  function isDayInRange(day: Date): boolean {
    const rangeEnd = tempEnd ?? hoverDate;
    if (!tempStart || !rangeEnd) return false;
    const start = isBefore(tempStart, rangeEnd) ? tempStart : rangeEnd;
    const end = isBefore(tempStart, rangeEnd) ? rangeEnd : tempStart;
    return isWithinInterval(day, { start, end });
  }

  function isDayStart(day: Date): boolean {
    return tempStart ? isSameDay(day, tempStart) : false;
  }

  function isDayEnd(day: Date): boolean {
    const rangeEnd = tempEnd ?? (hoverDate && tempStart ? hoverDate : null);
    return rangeEnd ? isSameDay(day, rangeEnd) : false;
  }

  // Build calendar grid for current calMonth
  function buildGrid() {
    const firstDay = startOfMonth(calMonth);
    // getDay: 0=Sun, 1=Mon, ..., 6=Sat → convert to Mon-start: Mon=0, ..., Sun=6
    const startDow = (getDay(firstDay) + 6) % 7;
    const totalDays = getDaysInMonth(calMonth);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), d));
    }
    return cells;
  }

  const grid = buildGrid();
  const canApply = tempStart !== null && tempEnd !== null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Period pills */}
      <div className="flex items-center bg-muted-hover rounded-lg p-1 gap-0.5">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
              period === p.value
                ? 'bg-layer text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date display pill — click to open calendar */}
      <div className="relative" ref={wrapperRef}>
        <button
          onClick={openCalendar}
          className={cn(
            'flex items-center gap-1.5 text-sm bg-layer border rounded-lg px-3 py-2 transition-colors',
            calOpen
              ? 'border-primary text-foreground ring-2 ring-primary/10'
              : 'border-layer-line text-muted-foreground-1 hover:border-primary/40'
          )}
        >
          <Calendar className="w-4 h-4 text-muted-foreground-2" />
          <span>
            {format(from, 'dd MMM yyyy', { locale: ca })}
            {' '}–{' '}
            {format(to, 'dd MMM yyyy', { locale: ca })}
          </span>
        </button>

        {/* Calendar panel */}
        {calOpen && (
          <div className="absolute top-full right-0 mt-2 z-50 bg-card rounded-xl border border-card-line shadow-xl p-4 w-72">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCalMonth(m => subMonths(m, 1))}
                className="p-1.5 rounded-lg hover:bg-muted-hover transition-colors text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-foreground capitalize">
                {format(calMonth, 'MMMM yyyy', { locale: ca })}
              </span>
              <button
                onClick={() => setCalMonth(m => addMonths(m, 1))}
                className="p-1.5 rounded-lg hover:bg-muted-hover transition-colors text-muted-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEK_DAYS.map(d => (
                <div key={d} className="text-center text-xs text-muted-foreground-2 font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {grid.map((day, idx) => {
                if (!day) return <div key={idx} />;

                const isStart = isDayStart(day);
                const isEnd = isDayEnd(day);
                const inRange = isDayInRange(day);
                const today = isToday(day);
                const isSelected = isStart || isEnd;

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => setHoverDate(day)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={cn(
                      'relative text-xs h-8 w-full flex items-center justify-center transition-colors',
                      isSelected && 'text-primary-foreground font-semibold',
                      !isSelected && inRange && 'bg-primary/10 text-foreground',
                      !isSelected && !inRange && 'text-foreground hover:bg-muted-hover',
                      today && !isSelected && 'font-semibold text-primary'
                    )}
                  >
                    <span
                      className={cn(
                        'w-7 h-7 flex items-center justify-center rounded-full',
                        isSelected && 'bg-primary',
                        today && !isSelected && 'ring-2 ring-primary/40 ring-offset-0'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selection hint */}
            <p className="text-xs text-muted-foreground-2 mt-3 text-center">
              {!tempStart
                ? 'Selecciona la data d\'inici'
                : !tempEnd
                ? 'Selecciona la data de fi'
                : `${format(tempStart, 'dd/MM/yyyy')} – ${format(tempEnd, 'dd/MM/yyyy')}`}
            </p>

            {/* Apply button */}
            <button
              onClick={applyRange}
              disabled={!canApply}
              className="mt-3 w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
