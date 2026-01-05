'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Link2, FileText, Database, ArrowRight } from 'lucide-react';

interface MappingConfig {
  id: string;
  name: string;
  sourceDatabaseId: string;
  sourceTableName: string;
  targetDocId: string;
  targetSheetId: string;
  fieldMappings: Array<{
    databaseColumn: string;
    documentField: string;
    dataType: string;
    transform?: string;
    defaultValue?: string;
  }>;
  status: 'draft' | 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  corpId?: string;
  targetName?: string;
  documentName?: string;
  sheetName?: string;
}

interface DatabaseConfig {
  id: string;
  name: string;
  type: string;
}

interface MappingReferenceListProps {
  show: boolean;
  onClose: () => void;
  databaseId: string;
  databaseName?: string;
}

export default function MappingReferenceList({
  show,
  onClose,
  databaseId,
  databaseName
}: MappingReferenceListProps) {
  const router = useRouter();
  const [mappings, setMappings] = useState<MappingConfig[]>([]);
  const [databases, setDatabases] = useState<DatabaseConfig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && databaseId) {
      fetchMappings();
      fetchDatabases();
    }
  }, [show, databaseId]);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mappings');
      const data = await response.json();

      if (data.success) {
        const filteredMappings = data.data.filter(
          (mapping: MappingConfig) => mapping.sourceDatabaseId === databaseId
        );
        setMappings(filteredMappings);
      } else {
        console.error('获取映射列表失败:', data.error);
      }
    } catch (err) {
      console.error('Error fetching mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabases = async () => {
    try {
      const response = await fetch('/api/databases');
      const data = await response.json();

      if (data.success) {
        setDatabases(data.data);
      }
    } catch (err) {
      console.error('Error fetching databases:', err);
    }
  };

  const getDatabaseName = (dbId: string): string => {
    const db = databases.find(d => d.id === dbId);
    return db?.name || '未知数据源';
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      active: '启用',
      inactive: '禁用'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      active: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      inactive: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  const handleMappingClick = (mappingId: string) => {
    router.push(`/mappings/edit/${mappingId}`);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/20">
              <Link2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                数据映射引用
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {databaseName || '数据源'} · {mappings.length} 个映射
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="max-h-[500px] overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
            </div>
          ) : mappings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Link2 className="mb-4 h-16 w-16 text-gray-400" />
              <h4 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                暂无数据映射
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                该数据源尚未被任何数据映射引用
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  onClick={() => handleMappingClick(mapping.id)}
                  className="group flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-purple-700"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/20">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>

                  <div className="flex min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {mapping.name}
                        </h4>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(mapping.status)}`}>
                          {getStatusLabel(mapping.status)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Database className="h-3.5 w-3.5" />
                          {getDatabaseName(mapping.sourceDatabaseId)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{mapping.sourceTableName}</span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{mapping.documentName || mapping.targetDocId}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="text-xs text-purple-600 dark:text-purple-400">
                        查看详情
                      </span>
                      <ArrowRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 p-6 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
