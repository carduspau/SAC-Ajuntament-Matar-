'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DateRangePicker } from './DateRangePicker';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Inici',
  '/estadistiques': 'Estadístiques',
  '/mapa': 'Mapa',
  '/barris': 'Barris',
  '/missatges': 'Missatges',
  '/informes': 'Informes',
};

export function Header() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? 'SAC Dashboard';

  return (
    <header className="relative h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-30">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <DateRangePicker />
    </header>
  );
}
