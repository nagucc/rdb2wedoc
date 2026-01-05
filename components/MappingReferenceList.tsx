'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, FileText, ArrowRight } from 'lucide-react';
import GenericReferenceDialog from './GenericReferenceDialog';

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
  createdAt: string;
  updatedAt: string;
  corpId?: string;
  targetName?: string;
  documentName?: string;
  sheetName?: string;
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && databaseId) {
      fetchMappings();
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

  const handleMappingClick = (mapping: MappingConfig) => {
    router.push(`/mappings/edit/${mapping.id}`);
    onClose();
  };

  const renderMappingItem = (mapping: MappingConfig) => (
    <div className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-purple-700">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/20">
        <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="flex min-w-0 flex-1">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {mapping.name}
          </h4>
        </div>

        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-xs text-purple-600 dark:text-purple-400">
            查看详情
          </span>
          <ArrowRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
    </div>
  );

  return (
    <GenericReferenceDialog<MappingConfig>
      show={show}
      onClose={onClose}
      title="数据映射引用"
      subtitle={`${databaseName || '数据源'} · ${mappings.length} 个映射`}
      icon={<Link2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
      items={mappings}
      loading={loading}
      renderItem={renderMappingItem}
      onItemClick={handleMappingClick}
      emptyState={{
        icon: <Link2 className="h-16 w-16" />,
        title: '暂无数据映射',
        description: '该数据源尚未被任何数据映射引用'
      }}
      maxHeight="500px"
      maxWidth="2xl"
      closeOnOverlayClick={true}
    />
  );
}