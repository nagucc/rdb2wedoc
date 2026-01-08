'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Save,
  ArrowRight,
  Database,
  FileText,
  Settings,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { MappingConfigUI, FieldMappingUI } from '@/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export default function DataMappingModule() {
  const [mappings, setMappings] = useState<MappingConfigUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<MappingConfigUI | null>(null);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/mappings');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('响应格式错误：期望JSON格式');
      }

      const data: ApiResponse<MappingConfigUI[]> = await response.json();

      if (data.success && data.data) {
        setMappings(data.data);
      } else {
        setError(data.error || '获取数据映射配置失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '网络错误，无法获取数据映射配置';
      setError(errorMessage);
      console.error('Error fetching mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleCreateMapping = async (mappingData: Partial<MappingConfigUI>) => {
    try {
      const response = await fetch('/api/mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mappingData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('响应格式错误：期望JSON格式');
      }

      const data: ApiResponse<MappingConfigUI> = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        fetchMappings();
      } else {
        console.error('Create mapping failed:', data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建映射配置失败';
      console.error(errorMessage, err);
    }
  };

  const handleUpdateMapping = async (id: string, mappingData: Partial<MappingConfigUI>) => {
    try {
      const response = await fetch(`/api/mappings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mappingData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('响应格式错误：期望JSON格式');
      }

      const data: ApiResponse<MappingConfigUI> = await response.json();

      if (data.success) {
        setShowEditModal(false);
        setSelectedMapping(null);
        fetchMappings();
      } else {
        console.error('Update mapping failed:', data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新映射配置失败';
      console.error(errorMessage, err);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!confirm('确定要删除此映射配置吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/mappings/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<void> = await response.json();

      if (data.success) {
        fetchMappings();
      } else {
        console.error('Delete mapping failed:', data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除映射配置失败';
      console.error(errorMessage, err);
    }
  };

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'string':
        return <FileText className="h-4 w-4" />;
      case 'number':
        return <Database className="h-4 w-4" />;
      case 'date':
        return <Settings className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const filteredMappings = mappings.filter(mapping => {
    const matchesSearch = mapping.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mapping.sourceDatabaseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mapping.sourceTableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mapping.targetDocId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mapping.targetSheetId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading && mappings.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载数据映射配置中...</p>
        </div>
      </div>
    );
  }

  if (error && mappings.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchMappings}
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">数据映射</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              previewMode
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {previewMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {previewMode ? '编辑模式' : '预览模式'}
          </button>
          <button
            onClick={fetchMappings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <Link
            href="/mappings/create"
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            新建映射
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索映射名称、数据源或目标..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredMappings.length === 0 ? (
          <div className="text-center py-12">
            <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg dark:text-gray-400">没有找到匹配的数据映射</p>
            <p className="text-gray-400 text-sm mt-2">尝试调整筛选条件或重置搜索</p>
          </div>
        ) : (
          filteredMappings.map((mapping) => (
            <div
              key={mapping.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{mapping.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Database className="h-4 w-4" />
                      {mapping.sourceDatabaseId}:{mapping.sourceTableName} <ArrowRight className="h-4 w-4" /> {mapping.targetDocId}:{mapping.targetSheetId}
                    </span>
                    <span 
                      onClick={() => {
                        setSelectedMapping(mapping);
                        setShowFieldMapping(true);
                      }}
                      className="flex items-center gap-1 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      {mapping.fieldMappings.length} 个字段映射
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!previewMode && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedMapping(mapping);
                          setShowEditModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors text-sm"
                      >
                        <Edit className="h-4 w-4" />
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteMapping(mapping.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>创建时间: {new Date(mapping.createdAt).toLocaleString()}</span>
                  <span>更新时间: {new Date(mapping.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showFieldMapping && selectedMapping && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    字段映射配置
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedMapping.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowFieldMapping(false);
                    setSelectedMapping(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {selectedMapping.fieldMappings.map((fieldMapping, index) => (
                  <div
                    key={fieldMapping.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {fieldMapping.databaseColumn}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {fieldMapping.documentField}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          {getDataTypeIcon(fieldMapping.dataType)}
                          {fieldMapping.dataType}
                        </span>
                        {fieldMapping.transform && (
                          <span>规则: {fieldMapping.transform}</span>
                        )}
                        {fieldMapping.defaultValue && (
                          <span>默认值: {fieldMapping.defaultValue}</span>
                        )}
                      </div>
                      {fieldMapping.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {fieldMapping.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowFieldMapping(false);
                    setSelectedMapping(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
