'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Inici',
  '/estadistiques': 'Estadístiques',
  '/tendencies': 'Tendències',
  '/alertes': 'Alertes crítiques',
  '/mapa': 'Mapa',
  '/barris': 'Barris',
  '/missatges': 'Missatges',
  '/informes': 'Informes',
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? 'SAC Dashboard';

  return (
    <header className="bg-navbar border-b border-navbar-line shrink-0 z-30 shadow-xs">
      {/* Main row */}
      <div className="h-16 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 -ml-1 rounded-lg hover:bg-muted-hover text-muted-foreground transition-colors shrink-0"
            onClick={onMenuClick}
            aria-label="Obrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
        </div>
        {/* Date picker — desktop only, inline in header */}
        <div className="hidden md:flex shrink-0 ml-4">
          <DateRangePicker />
        </div>
      </div>

      {/* Mobile date row — below title */}
      <div className="md:hidden px-4 pb-3 overflow-x-auto">
        <DateRangePicker />
      </div>
    </header>
  );
}
