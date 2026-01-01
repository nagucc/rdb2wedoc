import { useState, useEffect } from 'react';
import { Database, ChevronDown, Check, Info, RefreshCw, Clock, FileText } from 'lucide-react';
import { SyncMode, IncrementalType, PaginationConfig as PaginationConfigType, IncrementalConfig } from '@/types';

interface PaginationConfigProps {
  syncMode: SyncMode;
  pageSize?: number;
  enableResume?: boolean;
  lastSyncPosition?: string;
  maxRecordsPerSync?: number;
  incrementalType?: IncrementalType;
  incrementalField?: string;
  lastSyncValue?: string;
  onChange: (config: {
    syncMode: SyncMode;
    pageSize?: number;
    enableResume?: boolean;
    lastSyncPosition?: string;
    maxRecordsPerSync?: number;
    incrementalType?: IncrementalType;
    incrementalField?: string;
    lastSyncValue?: string;
  }) => void;
  disabled?: boolean;
  error?: string;
}

const SYNC_MODES: Array<{
  value: SyncMode;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'full',
    label: '全量同步',
    description: '每次同步全部数据，适合数据量较小的场景',
    icon: '📊'
  },
  {
    value: 'incremental',
    label: '增量同步',
    description: '仅同步新增或修改的数据，提高同步效率',
    icon: '🔄'
  },
  {
    value: 'paged',
    label: '分页同步',
    description: '按批次分页同步，支持大数据量处理和断点续传',
    icon: '📄'
  }
];

const INCREMENTAL_TYPES: Array<{
  value: IncrementalType;
  label: string;
  description: string;
}> = [
  {
    value: 'timestamp',
    label: '时间戳',
    description: '基于最后更新时间进行增量同步'
  },
  {
    value: 'id',
    label: 'ID',
    description: '基于自增ID进行增量同步'
  },
  {
    value: 'custom',
    label: '自定义字段',
    description: '基于指定字段进行增量同步'
  }
];

export default function PaginationConfig({
  syncMode,
  pageSize = 1000,
  enableResume = true,
  lastSyncPosition,
  maxRecordsPerSync = 10000,
  incrementalType = 'timestamp',
  incrementalField,
  lastSyncValue,
  onChange,
  disabled = false,
  error
}: PaginationConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customIncrementalField, setCustomIncrementalField] = useState(incrementalField || '');

  const selectedMode = SYNC_MODES.find(m => m.value === syncMode);
  const selectedIncrementalType = INCREMENTAL_TYPES.find(t => t.value === incrementalType);

  const handleModeChange = (mode: SyncMode) => {
    const newConfig = {
      syncMode: mode,
      pageSize: mode === 'paged' ? pageSize : undefined,
      enableResume: mode === 'paged' ? enableResume : undefined,
      maxRecordsPerSync: mode === 'paged' ? maxRecordsPerSync : undefined,
      incrementalType: mode === 'incremental' ? incrementalType : undefined,
      incrementalField: mode === 'incremental' ? incrementalField : undefined,
      lastSyncValue: mode === 'incremental' ? lastSyncValue : undefined
    };
    onChange(newConfig);
    setIsOpen(false);
  };

  const handlePageSizeChange = (value: number) => {
    onChange({ syncMode, pageSize: value, enableResume, lastSyncPosition, maxRecordsPerSync });
  };

  const handleMaxRecordsChange = (value: number) => {
    onChange({ syncMode, pageSize, enableResume, lastSyncPosition, maxRecordsPerSync: value });
  };

  const handleResumeToggle = (checked: boolean) => {
    onChange({ syncMode, pageSize, enableResume: checked, lastSyncPosition: checked ? lastSyncPosition : undefined, maxRecordsPerSync });
  };

  const handleIncrementalTypeChange = (type: IncrementalType) => {
    const field = type === 'custom' ? customIncrementalField : (type === 'timestamp' ? 'updated_at' : 'id');
    onChange({ syncMode, pageSize, enableResume, lastSyncPosition, maxRecordsPerSync, incrementalType: type, incrementalField: field });
  };

  const handleIncrementalFieldChange = (field: string) => {
    setCustomIncrementalField(field);
    onChange({ syncMode, pageSize, enableResume, lastSyncPosition, maxRecordsPerSync, incrementalType, incrementalField: field });
  };

  const formatLastSyncPosition = (position?: string): string => {
    if (!position) return '未开始';
    try {
      const parsed = JSON.parse(position);
      if (parsed.page && parsed.total) {
        return `第 ${parsed.page} 页 / 共 ${parsed.total} 页`;
      }
      if (parsed.lastId) {
        return `最后ID: ${parsed.lastId}`;
      }
      return position;
    } catch {
      return position;
    }
  };

  const formatLastSyncValue = (value?: string): string => {
    if (!value) return '无';
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('zh-CN');
      }
      return value;
    } catch {
      return value;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          同步模式
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border ${
              error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } rounded-lg shadow-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedMode?.icon}</span>
              <div className="text-left">
                <div className="font-medium text-gray-900 dark:text-white">
                  {selectedMode?.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedMode?.description}
                </div>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {SYNC_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => handleModeChange(mode.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    syncMode === mode.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <span className="text-2xl">{mode.icon}</span>
                  <div className="text-left flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {mode.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {mode.description}
                    </div>
                  </div>
                  {syncMode === mode.value && (
                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      {syncMode === 'paged' && (
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              分页大小
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="100"
                max="10000"
                step="100"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value) || 1000)}
                disabled={disabled}
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">条/页</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              建议值：1000-5000，根据网络状况和数据大小调整
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              单次同步最大记录数
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1000"
                max="100000"
                step="1000"
                value={maxRecordsPerSync}
                onChange={(e) => handleMaxRecordsChange(parseInt(e.target.value) || 10000)}
                disabled={disabled}
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">条</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              限制单次同步的总记录数，避免长时间运行
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  启用断点续传
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  同步中断后可从上次位置继续
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleResumeToggle(!enableResume)}
              disabled={disabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enableResume ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enableResume ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {enableResume && lastSyncPosition && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  最后同步位置
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {formatLastSyncPosition(lastSyncPosition)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {syncMode === 'incremental' && (
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              增量同步类型
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INCREMENTAL_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleIncrementalTypeChange(type.value)}
                  disabled={disabled}
                  className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                    incrementalType === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {incrementalType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                增量字段名
              </label>
              <input
                type="text"
                value={customIncrementalField}
                onChange={(e) => handleIncrementalFieldChange(e.target.value)}
                disabled={disabled}
                placeholder="输入字段名，如：created_at"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                指定用于增量同步的字段，该字段应能反映数据的新增或修改时间
              </p>
            </div>
          )}

          {incrementalField && (
            <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Database className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  增量字段
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {incrementalField}
                </div>
              </div>
            </div>
          )}

          {lastSyncValue && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  最后同步值
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {formatLastSyncValue(lastSyncValue)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
      >
        {showAdvanced ? '收起' : '高级选项'}
        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
      </button>

      {showAdvanced && (
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              同步超时时间
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="60"
                max="3600"
                step="60"
                defaultValue={300}
                disabled={disabled}
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">秒</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              单次同步操作的最大执行时间，超时将自动中止
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              并发线程数
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                defaultValue={1}
                disabled={disabled}
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">个</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              多线程并发同步可提高速度，但会增加服务器负载
            </p>
          </div>
        </div>
      )}
    </div>
  );
}