import React from 'react';
import Link from 'next/link';
import { BarChart2, Map, Building2, MessageSquare, FileText, ArrowRight } from 'lucide-react';

const ITEMS = [
  { href: '/estadistiques', label: 'Estadístiques', desc: 'Laboratori de dades i filtres', icon: BarChart2, color: 'bg-blue-50 text-blue-600' },
  { href: '/mapa', label: 'Mapa', desc: 'Visualització geogràfica', icon: Map, color: 'bg-blue-50 text-blue-600' },
  { href: '/barris', label: 'Barris', desc: 'Resum per barri', icon: Building2, color: 'bg-purple-50 text-purple-600' },
  { href: '/missatges', label: 'Missatges', desc: 'Explorador de missatges', icon: MessageSquare, color: 'bg-green-50 text-green-600' },
  { href: '/informes', label: 'Informes', desc: 'Generar i exportar PDF', icon: FileText, color: 'bg-orange-50 text-orange-600' },
];

export function QuickNav() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {ITEMS.map(({ href, label, desc, icon: Icon, color }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-card-hover transition-all group"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
