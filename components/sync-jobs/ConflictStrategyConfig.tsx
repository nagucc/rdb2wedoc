'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle,
  ChevronDown,
  Check,
  Info,
  Plus,
  Trash2,
  Settings
} from 'lucide-react';
import { ConflictStrategy, FieldConflictStrategy, FieldMapping, FieldConflictConfig } from '@/types';

interface ConflictStrategyConfigProps {
  globalStrategy: ConflictStrategy;
  fieldMappings: FieldMapping[];
  fieldConflictStrategies?: FieldConflictConfig[];
  onChange: (globalStrategy: ConflictStrategy, fieldStrategies?: FieldConflictConfig[]) => void;
  disabled?: boolean;
  error?: string;
}

const CONFLICT_STRATEGIES: Array<{
  value: ConflictStrategy;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'overwrite',
    label: '覆盖',
    description: '用新数据完全覆盖目标数据',
    icon: '🔄'
  },
  {
    value: 'append',
    label: '追加',
    description: '将新数据追加到目标数据',
    icon: '➕'
  },
  {
    value: 'ignore',
    label: '忽略',
    description: '跳过冲突的记录，保留原有数据',
    icon: '⏭️'
  },
  {
    value: 'merge',
    label: '合并',
    description: '智能合并新旧数据',
    icon: '🔀'
  },
  {
    value: 'skip',
    label: '跳过',
    description: '跳过冲突字段，继续处理其他字段',
    icon: '⏭️'
  },
  {
    value: 'error',
    label: '报错',
    description: '遇到冲突时停止同步并报错',
    icon: '❌'
  }
];

const FIELD_CONFLICT_STRATEGIES: Array<{
  value: FieldConflictStrategy;
  label: string;
  description: string;
}> = [
  {
    value: 'overwrite',
    label: '覆盖',
    description: '用新值覆盖旧值'
  },
  {
    value: 'preserve',
    label: '保留',
    description: '保留旧值，忽略新值'
  },
  {
    value: 'merge',
    label: '合并',
    description: '合并新旧值'
  },
  {
    value: 'skip',
    label: '跳过',
    description: '跳过该字段'
  }
];

export default function ConflictStrategyConfig({
  globalStrategy,
  fieldMappings,
  fieldConflictStrategies = [],
  onChange,
  disabled = false,
  error
}: ConflictStrategyConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [selectedFieldStrategy, setSelectedFieldStrategy] = useState<FieldConflictConfig | null>(null);
  const [mergeExpression, setMergeExpression] = useState('');

  useEffect(() => {
    if (selectedFieldStrategy) {
      setMergeExpression(selectedFieldStrategy.mergeExpression || '');
    }
  }, [selectedFieldStrategy]);

  const handleGlobalStrategyChange = (strategy: ConflictStrategy) => {
    onChange(strategy, fieldConflictStrategies);
    setIsOpen(false);
  };

  const handleAddFieldStrategy = (fieldName: string, strategy: FieldConflictStrategy) => {
    const newStrategy: FieldConflictConfig = {
      fieldName,
      strategy,
      mergeExpression: strategy === 'merge' ? '' : undefined
    };
    
    const updatedStrategies = fieldConflictStrategies.filter(s => s.fieldName !== fieldName);
    updatedStrategies.push(newStrategy);
    
    onChange(globalStrategy, updatedStrategies);
  };

  const handleUpdateFieldStrategy = (fieldName: string, updates: Partial<FieldConflictConfig>) => {
    const updatedStrategies = fieldConflictStrategies.map(s => 
      s.fieldName === fieldName ? { ...s, ...updates } : s
    );
    onChange(globalStrategy, updatedStrategies);
  };

  const handleRemoveFieldStrategy = (fieldName: string) => {
    const updatedStrategies = fieldConflictStrategies.filter(s => s.fieldName !== fieldName);
    onChange(globalStrategy, updatedStrategies);
  };

  const selectedGlobalStrategy = CONFLICT_STRATEGIES.find(s => s.value === globalStrategy);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          全局冲突解决策略
        </label>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
              error
                ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-900/20'
                : 'border-gray-300 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            {selectedGlobalStrategy ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedGlobalStrategy.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedGlobalStrategy.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedGlobalStrategy.description}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span>选择冲突解决策略</span>
                <ChevronDown className="h-4 w-4" />
              </div>
            )}
          </button>
        </div>

        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="max-h-96 overflow-y-auto">
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                选择冲突解决策略
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                当同步过程中出现数据冲突时，系统将使用此策略处理
              </p>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {CONFLICT_STRATEGIES.map((strategy) => (
                <button
                  key={strategy.value}
                  type="button"
                  onClick={() => handleGlobalStrategyChange(strategy.value)}
                  className={`w-full px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedGlobalStrategy?.value === strategy.value
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{strategy.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {strategy.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {strategy.description}
                      </p>
                    </div>
                    {selectedGlobalStrategy?.value === strategy.value && (
                      <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedGlobalStrategy && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                当前策略: {selectedGlobalStrategy.label}
              </p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                {selectedGlobalStrategy.description}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowFieldConfig(!showFieldConfig)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          <Settings className="h-4 w-4" />
          {showFieldConfig ? '隐藏' : '显示'}字段级别冲突策略配置
        </button>
      </div>

      {showFieldConfig && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              字段级别冲突策略
            </h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              为特定字段设置不同的冲突处理方式
            </span>
          </div>

          {fieldMappings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <AlertTriangle className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">暂无字段映射，请先配置字段映射</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fieldMappings.map((mapping) => {
                const fieldStrategy = fieldConflictStrategies.find(s => s.fieldName === mapping.documentField);
                
                return (
                  <div
                    key={mapping.documentField}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {mapping.documentField}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        源字段: {mapping.databaseColumn}
                      </div>
                    </div>

                    <select
                      value={fieldStrategy?.strategy || ''}
                      onChange={(e) => {
                        const value = e.target.value as FieldConflictStrategy;
                        if (value) {
                          handleAddFieldStrategy(mapping.documentField, value);
                        } else {
                          handleRemoveFieldStrategy(mapping.documentField);
                        }
                      }}
                      disabled={disabled}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">使用全局策略</option>
                      {FIELD_CONFLICT_STRATEGIES.map((strategy) => (
                        <option key={strategy.value} value={strategy.value}>
                          {strategy.label}
                        </option>
                      ))}
                    </select>

                    {fieldStrategy?.strategy === 'merge' && (
                      <input
                        type="text"
                        value={fieldStrategy.mergeExpression || ''}
                        onChange={(e) => handleUpdateFieldStrategy(mapping.documentField, { mergeExpression: e.target.value })}
                        placeholder="合并表达式"
                        disabled={disabled}
                        className="w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    )}

                    {fieldStrategy && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFieldStrategy(mapping.documentField)}
                        disabled={disabled}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {fieldConflictStrategies.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
          <div className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-300">
                已配置 {fieldConflictStrategies.length} 个字段的冲突策略
              </p>
              <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                这些字段将使用自定义策略，其他字段将使用全局策略
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
