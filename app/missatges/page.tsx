'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import { Search, Download, ChevronUp, ChevronDown, ChevronsUpDown, Filter, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { SentimentBadge, CanalBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { MessageDetail } from '@/components/missatges/MessageDetail';
import { useMessages } from '@/hooks/useMessages';
import { useFilters } from '@/hooks/useFilters';
import { useDateRange } from '@/context/DateRangeContext';
import { formatDate, truncate } from '@/lib/utils';
import { messagesToCsv, downloadCsv } from '@/lib/csv';
import { INTENT_META, DEPT_META, ACTION_META, LANGUAGE_META, EXPERIENCE_META, intentMeta } from '@/lib/intentColors';
import type { SacMessage, FilterState } from '@/types';

const INTENT_ORDER = ['queixa', 'incidència', 'consulta', 'sol·licitud', 'suggeriment', 'agraïment'];

const col = createColumnHelper<SacMessage>();

export default function MissatgesPage() {
  const { from, to } = useDateRange();
  const { filters, setFilter, resetFilters } = useFilters({
    page: 0, pageSize: 25, sortBy: 'data_inici', sortDir: 'desc',
    from, to,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selected, setSelected] = useState<SacMessage | null>(null);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const activeFilters: FilterState = useMemo(() => ({ ...filters, from, to }), [filters, from, to]);
  const { data: { data: rows, count }, loading } = useMessages(activeFilters);

  const columns = useMemo(() => [
    col.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="rounded"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="rounded"
        />
      ),
      size: 40,
    }),
    col.accessor('saved_id', { header: 'Ref.', size: 90 }),
    col.accessor('data_inici', {
      header: 'Data',
      cell: info => <span className="whitespace-nowrap">{formatDate(info.getValue(), 'dd/MM/yy')}</span>,
      size: 90,
    }),
    col.accessor('barri', { header: 'Barri', size: 120 }),
    col.accessor('canal', {
      header: 'Canal',
      cell: info => <CanalBadge canal={info.getValue()} />,
      size: 140,
    }),
    col.accessor('clas1', {
      header: 'Categoria',
      cell: info => <span className="text-xs text-muted-foreground-1">{info.getValue() ?? '—'}</span>,
    }),
    col.accessor('sentiment', {
      header: 'Sent.',
      cell: info => <SentimentBadge value={info.getValue()} />,
      size: 100,
    }),
    col.accessor('situation', { header: 'Urg.', size: 70 }),
    col.accessor('message', {
      header: 'Missatge',
      cell: info => (
        <span className="text-xs text-muted-foreground-1 line-clamp-1 max-w-[220px]">
          {truncate(info.getValue(), 80)}
        </span>
      ),
    }),
  ], []);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: count,
    state: { sorting, rowSelection },
    onSortingChange: (updater) => {
      const newSort = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSort);
      if (newSort.length > 0) {
        setFilter('sortBy', newSort[0].id);
        setFilter('sortDir', newSort[0].desc ? 'desc' : 'asc');
      }
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
  });

  function exportCsv() {
    const selectedRows = Object.keys(rowSelection).map(idx => rows[parseInt(idx)]).filter(Boolean);
    const toExport = selectedRows.length > 0 ? selectedRows : rows;
    downloadCsv(messagesToCsv(toExport), `missatges-sac-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const selectedCount = Object.keys(rowSelection).length;
  const activeFilterCount = [
    filters.q, filters.barri, filters.canal, filters.clas1,
    filters.intent, filters.department, filters.action_required,
    filters.language, filters.citizen_experience_signal,
  ].filter(Boolean).length + (filters.followup_needed ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <Input
              label="Cerca al text"
              placeholder="Busca paraules clau..."
              value={filters.q ?? ''}
              onChange={e => setFilter('q', e.target.value || undefined)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="w-36">
            <Input
              label="Barri"
              placeholder="Barri..."
              value={filters.barri ?? ''}
              onChange={e => setFilter('barri', e.target.value || undefined)}
            />
          </div>
          <div className="w-40">
            <Input
              label="Canal"
              placeholder="Canal..."
              value={filters.canal ?? ''}
              onChange={e => setFilter('canal', e.target.value || undefined)}
            />
          </div>
          <div className="w-36">
            <Input
              label="Sent. màx"
              type="number"
              min={0} max={10} step={0.5}
              placeholder="p.ex. 3"
              value={filters.sentimentMax ?? ''}
              onChange={e => setFilter('sentimentMax', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" icon={<X className="w-3 h-3" />} onClick={resetFilters}>
              Netejar
            </Button>
          )}
        </div>

        {/* Second filter row */}
        <div className="flex flex-wrap gap-3 items-end pt-2 border-t border-card-line mt-2">
          <div className="w-36">
            <Select label="Intenció" value={filters.intent ?? ''} onChange={e => setFilter('intent', e.target.value || undefined)}
              options={[{ value: '', label: 'Totes' }, ...INTENT_ORDER.map(k => ({ value: k, label: intentMeta(k).label }))]} />
          </div>
          <div className="w-40">
            <Select label="Departament" value={filters.department ?? ''} onChange={e => setFilter('department', e.target.value || undefined)}
              options={[{ value: '', label: 'Tots' }, ...Object.entries(DEPT_META).map(([v, m]) => ({ value: v, label: m.label }))]} />
          </div>
          <div className="w-40">
            <Select label="Acció requerida" value={filters.action_required ?? ''} onChange={e => setFilter('action_required', e.target.value || undefined)}
              options={[{ value: '', label: 'Totes' }, ...Object.entries(ACTION_META).map(([v, m]) => ({ value: v, label: m.label }))]} />
          </div>
          <div className="w-32">
            <Select label="Idioma" value={filters.language ?? ''} onChange={e => setFilter('language', e.target.value || undefined)}
              options={[{ value: '', label: 'Tots' }, ...Object.entries(LANGUAGE_META).map(([v, m]) => ({ value: v, label: m.label }))]} />
          </div>
          <div className="w-40">
            <Select label="Experiència" value={filters.citizen_experience_signal ?? ''} onChange={e => setFilter('citizen_experience_signal', e.target.value || undefined)}
              options={[{ value: '', label: 'Totes' }, ...Object.entries(EXPERIENCE_META).map(([v, m]) => ({ value: v, label: m.label }))]} />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground-1 cursor-pointer pb-1.5">
            <input type="checkbox" checked={filters.followup_needed ?? false} onChange={e => setFilter('followup_needed', e.target.checked || undefined)}
              className="rounded accent-primary" />
            Seguiment pendent
          </label>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-card-line">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Missatges</h2>
            <span className="text-xs text-muted-foreground-2">{count.toLocaleString('ca-ES')} resultats</span>
            {selectedCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                {selectedCount} seleccionats
              </span>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={exportCsv}
          >
            Exportar CSV{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line-2">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      className="text-left px-3 py-3 text-xs font-medium text-muted-foreground-2 uppercase tracking-wide whitespace-nowrap"
                      style={{ width: header.getSize() }}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' ? <ChevronUp className="w-3 h-3" /> :
                           header.column.getIsSorted() === 'desc' ? <ChevronDown className="w-3 h-3" /> :
                           <ChevronsUpDown className="w-3 h-3 text-muted-foreground-2" />}
                        </button>
                      ) : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-line-2">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-muted-foreground-2 text-sm">
                    No s'han trobat missatges amb els filtres actuals
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-muted-hover cursor-pointer transition-colors"
                    onClick={() => setSelected(row.original)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="px-3 py-3"
                        onClick={cell.column.id === 'select' ? e => e.stopPropagation() : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5">
          <Pagination
            page={filters.page ?? 0}
            pageSize={filters.pageSize ?? 25}
            total={count}
            onPageChange={p => setFilter('page', p)}
          />
        </div>
      </Card>

      <MessageDetail message={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
