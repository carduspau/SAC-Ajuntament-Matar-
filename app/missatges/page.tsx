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
import type { SacMessage, FilterState } from '@/types';

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
      cell: info => <span className="text-xs text-gray-600">{info.getValue() ?? '—'}</span>,
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
        <span className="text-xs text-gray-600 line-clamp-1 max-w-[220px]">
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
  const activeFilterCount = [filters.q, filters.barri, filters.canal, filters.clas1].filter(Boolean).length;

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
      </Card>

      {/* Table */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700">Missatges</h2>
            <span className="text-xs text-gray-400">{count.toLocaleString('ca-ES')} resultats</span>
            {selectedCount > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
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
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-gray-100">
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      style={{ width: header.getSize() }}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-gray-900"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' ? <ChevronUp className="w-3 h-3" /> :
                           header.column.getIsSorted() === 'desc' ? <ChevronDown className="w-3 h-3" /> :
                           <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
                        </button>
                      ) : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400 text-sm">
                    No s'han trobat missatges amb els filtres actuals
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
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
