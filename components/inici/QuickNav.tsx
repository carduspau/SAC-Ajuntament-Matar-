import React from 'react';
import Link from 'next/link';
import {
  BarChart2, TrendingUp, AlertTriangle, Layers, ClipboardList,
  Map, Building2, MessageSquare, FileText, ArrowRight,
} from 'lucide-react';

const ITEMS = [
  { href: '/estadistiques', label: 'Estadístiques',     desc: 'Laboratori de dades i filtres',  icon: BarChart2,     color: 'bg-primary/5 text-primary' },
  { href: '/tendencies',   label: 'Tendències',         desc: 'Evolució i projeccions',          icon: TrendingUp,    color: 'bg-violet-50 text-violet-600' },
  { href: '/alertes',      label: 'Alertes crítiques',  desc: 'Missatges de baix sentiment',     icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  { href: '/departaments', label: 'Departaments',       desc: 'Activitat per àrea municipal',    icon: Layers,        color: 'bg-blue-50 text-blue-600' },
  { href: '/gestio',       label: 'Gestió operativa',   desc: 'Seguiment i accions pendents',    icon: ClipboardList, color: 'bg-slate-100 text-slate-600' },
  { href: '/mapa',         label: 'Mapa',               desc: 'Visualització geogràfica',        icon: Map,           color: 'bg-primary/5 text-primary' },
  { href: '/barris',       label: 'Barris',             desc: 'Resum per barri',                 icon: Building2,     color: 'bg-purple-50 text-purple-600' },
  { href: '/missatges',    label: 'Missatges',          desc: 'Explorador de missatges',         icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600' },
  { href: '/informes',     label: 'Informes',           desc: 'Generar i exportar PDF',          icon: FileText,      color: 'bg-amber-50 text-amber-600' },
];

export function QuickNav() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-3">
      {ITEMS.map(({ href, label, desc, icon: Icon, color }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col gap-3 p-4 bg-card rounded-xl border border-card-line hover:border-primary/30 hover:shadow-xs transition-all group"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <ArrowRight className="w-4 h-4 text-muted-foreground-2 group-hover:text-primary transition-colors" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
