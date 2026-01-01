'use client';

import { useState, useEffect } from 'react';
import { 
  FileText,
  ChevronDown,
  Check,
  Search,
  Info,
  Database,
  ArrowRight
} from 'lucide-react';
import { MappingConfig, FieldMapping } from '@/types';

interface MappingSelectorProps {
  selectedMappingId?: string;
  onMappingChange: (mappingId: string) => void;
  disabled?: boolean;
  error?: string;
}

export default function MappingSelector({
  selectedMappingId,
  onMappingChange,
  disabled = false,
  error
}: MappingSelectorProps) {
  const [mappings, setMappings] = useState<MappingConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMapping, setSelectedMapping] = useState<MappingConfig | null>(null);

  useEffect(() => {
    fetchMappings();
  }, []);

  useEffect(() => {
    if (selectedMappingId && mappings.length > 0) {
      const mapping = mappings.find(m => m.id === selectedMappingId);
      setSelectedMapping(mapping || null);
    }
  }, [selectedMappingId, mappings]);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mappings');
      const result = await response.json();

      if (result.success) {
        setMappings(result.data || []);
      }
    } catch (error) {
      console.error('获取数据映射失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMappings = mappings.filter(mapping =>
    mapping.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mapping.sourceTableName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (mapping: MappingConfig) => {
    setSelectedMapping(mapping);
    onMappingChange(mapping.id);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedMapping(null);
    onMappingChange('');
  };

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        选择数据映射
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
          {selectedMapping ? (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedMapping.name}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Database className="h-3 w-3" />
                  <span>{selectedMapping.sourceTableName}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{selectedMapping.sheetName || selectedMapping.targetSheetId}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {selectedMapping.fieldMappings.length} 字段
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
              <span>选择预设的数据映射配置</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          )}
        </button>

        {selectedMapping && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 p-3 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索数据映射..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : filteredMappings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                <FileText className="mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">
                  {searchQuery ? '未找到匹配的数据映射' : '暂无数据映射配置'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMappings.map((mapping) => (
                  <button
                    key={mapping.id}
                    type="button"
                    onClick={() => handleSelect(mapping)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedMapping?.id === mapping.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {mapping.name}
                          </span>
                          {mapping.status === 'active' && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              活跃
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Database className="h-3 w-3" />
                          <span>{mapping.sourceTableName}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{mapping.sheetName || mapping.targetSheetId}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {mapping.fieldMappings.length} 字段
                        </span>
                        {selectedMapping?.id === mapping.id && (
                          <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-3 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/mappings/create';
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
            >
              <FileText className="h-4 w-4" />
              创建新的数据映射
            </button>
          </div>
        </div>
      )}

      {selectedMapping && (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-900/20">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                已选择数据映射配置
              </p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                源表: {selectedMapping.sourceTableName} → 目标表: {selectedMapping.sheetName || selectedMapping.targetSheetId}
              </p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                包含 {selectedMapping.fieldMappings.length} 个字段映射规则
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
