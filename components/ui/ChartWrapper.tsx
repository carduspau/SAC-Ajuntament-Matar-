'use client';

import React, { useRef } from 'react';
import { downloadPng, downloadCsv, ChartDownloadButtons } from './ChartDownload';

interface ChartWrapperProps {
  title: string;
  label?: string;
  csvData?: Record<string, unknown>[];
  children: React.ReactNode;
  className?: string;
}

export function ChartWrapper({ title, label, csvData, children, className }: ChartWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);

  if (label) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground-1 uppercase tracking-wide">{label}</h3>
          <ChartDownloadButtons
            onPng={() => ref.current && downloadPng(ref.current, title)}
            onCsv={csvData ? () => downloadCsv(title, csvData) : undefined}
          />
        </div>
        <div ref={ref}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative group${className ? ` ${className}` : ''}`}>
      <div className="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChartDownloadButtons
          onPng={() => ref.current && downloadPng(ref.current, title)}
          onCsv={csvData ? () => downloadCsv(title, csvData) : undefined}
        />
      </div>
      {children}
    </div>
  );
}
