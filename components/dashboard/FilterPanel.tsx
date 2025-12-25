'use client';

import { X, Filter } from 'lucide-react';

interface FilterPanelProps {
  statusFilter: 'all' | 'success' | 'failed' | 'running';
  onStatusFilterChange: (filter: 'all' | 'success' | 'failed' | 'running') => void;
  onClose: () => void;
}

export default function FilterPanel({
  statusFilter,
  onStatusFilterChange,
  onClose
}: FilterPanelProps) {
  const statusOptions = [
    { value: 'all', label: '全部状态', icon: '📊' },
    { value: 'success', label: '成功', icon: '✅' },
    { value: 'failed', label: '失败', icon: '❌' },
    { value: 'running', label: '运行中', icon: '⏳' }
  ];

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            筛选条件
          </h3>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            作业状态
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onStatusFilterChange(option.value as any)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  statusFilter === option.value
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-2xl">{option.icon}</span>
                <span className={`text-sm font-medium ${
                  statusFilter === option.value
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            已选择: <span className="font-medium text-gray-900 dark:text-white">
              {statusOptions.find(opt => opt.value === statusFilter)?.label}
            </span>
          </div>
          <button
            onClick={() => onStatusFilterChange('all')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            重置筛选
          </button>
        </div>
      </div>
    </div>
  );
}
