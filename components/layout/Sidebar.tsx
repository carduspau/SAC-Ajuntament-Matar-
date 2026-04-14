'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BarChart2, Map, Building2,
  MessageSquare, FileText, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Inici', icon: LayoutDashboard },
  { href: '/estadistiques', label: 'Estadístiques', icon: BarChart2 },
  { href: '/mapa', label: 'Mapa', icon: Map },
  { href: '/barris', label: 'Barris', icon: Building2 },
  { href: '/missatges', label: 'Missatges', icon: MessageSquare },
  { href: '/informes', label: 'Informes', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-5 py-5 border-b border-slate-100',
        collapsed && 'justify-center px-2'
      )}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white text-xs font-bold font-serif tracking-tight">SAC</span>
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-none font-serif">SAC</p>
            <p className="text-xs text-slate-400 mt-0.5">Ajuntament Mataró</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg mb-0.5 transition-colors text-sm font-medium',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-blue-600' : 'text-slate-500')} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-100 p-2">
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-100 transition-colors',
            collapsed && 'justify-center'
          )}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-4 h-4" /><span>Reduir</span></>}
        </button>
      </div>
    </aside>
  );
}
