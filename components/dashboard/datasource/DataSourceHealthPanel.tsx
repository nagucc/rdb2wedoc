'use client';

import { DataSourceMetrics } from '@/lib/services/datasource.service';

interface DataSourceHealthPanelProps {
  metrics: DataSourceMetrics;
}

export default function DataSourceHealthPanel({ metrics }: DataSourceHealthPanelProps) {
  return (
    <div className="space-y-6">
    </div>
  );
}