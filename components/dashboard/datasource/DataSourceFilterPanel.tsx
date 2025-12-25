'use client';

import { useState } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';

export interface FilterState {
  searchQuery: string;
  statusFilter: 'all' | 'connected' | 'disconnected' | 'error';
  sortBy: 'name' | 'healthScore' | 'lastSyncTime' | 'totalQueries';
  sortOrder: 'asc' | 'desc';
}

interface DataSourceFilterPanelProps {
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  activeFilters: FilterState;
  totalResults: number;
}

export default function DataSourceFilterPanel({
  onFilterChange,
  onReset,
  activeFilters,
  totalResults
}: DataSourceFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const handleSearchChange = (value: string) => {
    onFilterChange({ ...activeFilters, searchQuery: value });
  };

  const handleStatusChange = (status: FilterState['statusFilter']) => {
    onFilterChange({ ...activeFilters, statusFilter: status });
    setShowStatusDropdown(false);
  };

  const handleSortChange = (sortBy: FilterState['sortBy']) => {
    const newSortOrder = activeFilters.sortBy === sortBy && activeFilters.sortOrder === 'asc' ? 'desc' : 'asc';
    onFilterChange({ ...activeFilters, sortBy, sortOrder: newSortOrder });
    setShowSortDropdown(false);
  };

  const hasActiveFilters = 
    activeFilters.searchQuery !== '' || 
    activeFilters.statusFilter !== 'all';

  const getStatusLabel = (status: FilterState['statusFilter']) => {
    switch (status) {
      case 'all':
        return '全部状态';
      case 'connected':
        return '已连接';
      case 'disconnected':
        return '已断开';
      case 'error':
        return '错误';
    }
  };

  const getSortLabel = (sortBy: FilterState['sortBy']) => {
    switch (sortBy) {
      case 'name':
        return '名称';
      case 'healthScore':
        return '健康评分';
      case 'lastSyncTime':
        return '同步时间';
      case 'totalQueries':
        return '查询次数';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">筛选与搜索</h3>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
                重置
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronDown 
                className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索数据源名称..."
                value={activeFilters.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-w-[140px]"
                >
                  <span className="text-gray-700">{getStatusLabel(activeFilters.statusFilter)}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {showStatusDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      {(['all', 'connected', 'disconnected', 'error'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                            activeFilters.statusFilter === status ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {getStatusLabel(status)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-w-[140px]"
                >
                  <span className="text-gray-700">{getSortLabel(activeFilters.sortBy)}</span>
                  <span className="text-gray-400 text-sm">
                    {activeFilters.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {showSortDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      {(['name', 'healthScore', 'lastSyncTime', 'totalQueries'] as const).map((sortBy) => (
                        <button
                          key={sortBy}
                          onClick={() => handleSortChange(sortBy)}
                          className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                            activeFilters.sortBy === sortBy ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {getSortLabel(sortBy)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                显示 <span className="font-semibold text-gray-900">{totalResults}</span> 个数据源
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-sm rounded-md">
                      搜索: {activeFilters.searchQuery}
                      <button
                        onClick={() => handleSearchChange('')}
                        className="hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {activeFilters.statusFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-sm rounded-md">
                      状态: {getStatusLabel(activeFilters.statusFilter)}
                      <button
                        onClick={() => handleStatusChange('all')}
                        className="hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
