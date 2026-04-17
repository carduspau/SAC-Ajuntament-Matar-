'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BarChart2, Map, Building2,
  MessageSquare, FileText, ChevronLeft, ChevronRight,
  AlertTriangle, User, LogOut, Layers, ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCriticalCount } from '@/hooks/useCriticalCount';

const NAV_ITEMS = [
  { href: '/', label: 'Inici', icon: LayoutDashboard },
  { href: '/estadistiques', label: 'Estadístiques', icon: BarChart2 },
  { href: '/alertes', label: 'Alertes crítiques', icon: AlertTriangle },
  { href: '/departaments', label: 'Departaments', icon: Layers },
  { href: '/gestio', label: 'Gestió operativa', icon: ClipboardList },
  { href: '/mapa', label: 'Mapa', icon: Map },
  { href: '/barris', label: 'Barris', icon: Building2 },
  { href: '/missatges', label: 'Missatges', icon: MessageSquare },
  { href: '/informes', label: 'Informes', icon: FileText },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const criticalCount = useCriticalCount();

  return (
    <aside
      className={cn(
        'flex-col bg-sidebar border-r border-sidebar-line transition-all duration-200 shrink-0',
        mobileOpen
          ? 'fixed inset-y-0 left-0 z-50 flex h-full w-64'
          : cn('hidden md:flex h-full', collapsed ? 'md:w-16' : 'md:w-64'),
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-5 py-5 border-b border-sidebar-line',
        collapsed && !mobileOpen && 'justify-center px-2'
      )}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-2xs">
          <span className="text-primary-foreground text-xs font-bold tracking-tight">SAC</span>
        </div>
        {(!collapsed || mobileOpen) && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-none">SAC</p>
            <p className="text-xs text-muted-foreground-2 mt-0.5">Ajuntament Mataró</p>
          </div>
        )}
        {/* Close button — mobile only */}
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg hover:bg-muted-hover text-muted-foreground transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const isAlertes = href === '/alertes';
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg mb-0.5 transition-colors text-sm font-medium',
                active
                  ? 'bg-sidebar-nav-active text-primary'
                  : 'text-sidebar-nav-foreground hover:bg-sidebar-nav-hover hover:text-foreground',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className={cn(
                'w-5 h-5 shrink-0',
                active ? 'text-primary' : 'text-muted-foreground'
              )} />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {isAlertes && criticalCount !== null && criticalCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {criticalCount > 99 ? '99+' : criticalCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className={cn(
        'border-t border-sidebar-divider px-3 py-3 flex items-center gap-3',
        collapsed && 'justify-center px-2'
      )}>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">Admin SAC</p>
              <p className="text-xs text-muted-foreground-2 truncate">Ajuntament de Mataró</p>
            </div>
            <button
              title="Tancar sessió"
              className="p-1.5 rounded-lg hover:bg-muted-hover text-muted-foreground-2 hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Collapse toggle — desktop only */}
      <div className="border-t border-sidebar-divider p-2 hidden md:block">
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted-hover transition-colors',
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
