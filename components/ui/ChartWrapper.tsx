'use client';

import React, { useRef } from 'react';
import { downloadPng, downloadCsv, ChartDownloadButtons } from './ChartDownload';

interface ChartWrapperProps {
  title: string;
  csvData?: Record<string, unknown>[];
  children: React.ReactNode;
  className?: string;
}

export function ChartWrapper({ title, csvData, children, className }: ChartWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className={`relative${className ? ` ${className}` : ''}`}>
      <div className="absolute top-0 right-0 z-10">
        <ChartDownloadButtons
          onPng={() => ref.current && downloadPng(ref.current, title)}
          onCsv={csvData ? () => downloadCsv(title, csvData) : undefined}
        />
      </div>
      {children}
    </div>
  );
}
