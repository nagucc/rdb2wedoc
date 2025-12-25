'use client';

import { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertCircle } from 'lucide-react';
import DataSourceInfoCard from './DataSourceInfoCard';
import DataSourceHealthPanel from './DataSourceHealthPanel';
import DataSourceStatsChart from './DataSourceStatsChart';
import DataSourceFilterPanel, { FilterState } from './DataSourceFilterPanel';
import { DataSourceMetrics, DataSourceStats } from '@/lib/services/datasource.service';

export default function DataSourceModule() {
  const [metrics, setMetrics] = useState<DataSourceMetrics[]>([]);
  const [stats, setStats] = useState<DataSourceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSourceMetrics | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    statusFilter: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/datasources');
      const data = await response.json();

      if (data.success) {
        setMetrics(data.data.metrics);
        setStats(data.data.stats);
      } else {
        setError(data.error || 'Failed to fetch data sources');
      }
    } catch (err) {
      setError('Network error while fetching data sources');
      console.error('Error fetching data sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
    const interval = setInterval(fetchDataSources, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      statusFilter: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  const getFilteredAndSortedMetrics = () => {
    let filtered = [...metrics];

    if (filters.searchQuery) {
      filtered = filtered.filter(m =>
        m.dataSourceName.toLowerCase().includes(filters.searchQuery.toLowerCase())
      );
    }

    if (filters.statusFilter !== 'all') {
      filtered = filtered.filter(m => m.connectionStatus === filters.statusFilter);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.dataSourceName.localeCompare(b.dataSourceName);
          break;
        case 'healthScore':
          comparison = a.healthScore - b.healthScore;
          break;
        case 'lastSyncTime':
          comparison = new Date(a.lastSyncTime).getTime() - new Date(b.lastSyncTime).getTime();
          break;
        case 'totalQueries':
          comparison = a.totalQueries - b.totalQueries;
          break;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredMetrics = getFilteredAndSortedMetrics();

  if (loading && metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载数据源信息中...</p>
        </div>
      </div>
    );
  }

  if (error && metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDataSources}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">数据源管理</h2>
        </div>
        <button
          onClick={fetchDataSources}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      <DataSourceFilterPanel
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        activeFilters={filters}
        totalResults={filteredMetrics.length}
      />

      {stats && <DataSourceStatsChart stats={stats} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMetrics.map((metric) => (
          <div key={metric.dataSourceId} className="space-y-4">
            <DataSourceInfoCard
              metrics={metric}
              onClick={() => setSelectedDataSource(metric)}
            />
            <DataSourceHealthPanel metrics={metric} />
          </div>
        ))}
      </div>

      {filteredMetrics.length === 0 && !loading && (
        <div className="text-center py-12">
          <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">没有找到匹配的数据源</p>
          <p className="text-gray-400 text-sm mt-2">尝试调整筛选条件或重置搜索</p>
        </div>
      )}
    </div>
  );
}
