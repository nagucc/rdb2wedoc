'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Info
} from 'lucide-react';
import Header from '@/components/layout/Header';
import MappingSelector from '@/components/sync-jobs/MappingSelector';
import ScheduleConfig from '@/components/sync-jobs/ScheduleConfig';
import ConflictStrategyConfig from '@/components/sync-jobs/ConflictStrategyConfig';
import PaginationConfig from '@/components/sync-jobs/PaginationConfig';
import { ConflictStrategy, SyncMode, IncrementalType, FieldConflictStrategy, MappingConfig } from '@/types';

interface SyncJobFormData {
  name: string;
  description: string;
  mappingConfigId: string;
  schedule: string;
  scheduleTemplate: string;
  conflictStrategy: ConflictStrategy;
  syncMode: SyncMode;
  incrementalType: IncrementalType;
  incrementalField: string;
  pageSize: number;
  enableResume: boolean;
  lastSyncPosition: string;
  fieldConflictStrategies: Array<{ fieldName: string; strategy: FieldConflictStrategy; mergeExpression?: string }>;
  syncTimeout: number;
  maxRecordsPerSync: number;
  enableDataValidation: boolean;
  enabled: boolean;
}

export default function CreateSyncJobPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<SyncJobFormData>({
    name: '',
    description: '',
    mappingConfigId: '',
    schedule: '0 0 * * *',
    scheduleTemplate: '',
    conflictStrategy: 'overwrite',
    syncMode: 'full',
    incrementalType: 'timestamp',
    incrementalField: '',
    pageSize: 1000,
    enableResume: true,
    lastSyncPosition: '',
    fieldConflictStrategies: [],
    syncTimeout: 300,
    maxRecordsPerSync: 10000,
    enableDataValidation: true,
    enabled: true
  });
  const [selectedMapping, setSelectedMapping] = useState<MappingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleMappingChange = (mappingId: string) => {
    setFormData(prev => ({ ...prev, mappingConfigId: mappingId }));
  };

  const handleScheduleChange = (schedule: string, templateName?: string) => {
    setFormData(prev => ({ 
      ...prev, 
      schedule,
      scheduleTemplate: templateName || ''
    }));
  };

  const handleConflictStrategyChange = (globalStrategy: ConflictStrategy, fieldStrategies?: any[]) => {
    setFormData(prev => ({ 
      ...prev, 
      conflictStrategy: globalStrategy,
      fieldConflictStrategies: fieldStrategies || []
    }));
  };

  const handlePaginationConfigChange = (config: any) => {
    setFormData(prev => ({ 
      ...prev, 
      pageSize: config.pageSize,
      enableResume: config.enableResume,
      syncTimeout: config.syncTimeout,
      maxRecordsPerSync: config.maxRecordsPerSync,
      enableDataValidation: config.enableDataValidation
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入作业名称';
    } else if (formData.name.length < 2) {
      newErrors.name = '作业名称至少需要2个字符';
    } else if (formData.name.length > 100) {
      newErrors.name = '作业名称不能超过100个字符';
    }

    if (!formData.mappingConfigId.trim()) {
      newErrors.mappingConfigId = '请选择数据映射配置';
    }

    if (!formData.schedule.trim()) {
      newErrors.schedule = '请输入同步周期配置';
    } else {
      const parts = formData.schedule.trim().split(/\s+/);
      if (parts.length !== 5) {
        newErrors.schedule = 'crond表达式格式不正确，应为5个字段（分 时 日 月 周）';
      }
    }

    if (formData.syncMode === 'incremental' && !formData.incrementalField.trim()) {
      newErrors.incrementalField = '增量同步需要指定增量字段';
    }

    if (formData.pageSize < 1 || formData.pageSize > 100000) {
      newErrors.pageSize = '每页记录数必须在1-100000之间';
    }

    if (formData.syncTimeout < 1 || formData.syncTimeout > 3600) {
      newErrors.syncTimeout = '同步超时时间必须在1-3600秒之间';
    }

    if (formData.maxRecordsPerSync < 1 || formData.maxRecordsPerSync > 1000000) {
      newErrors.maxRecordsPerSync = '最大记录数必须在1-1000000之间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setErrors({ submit: '服务器返回了非JSON响应' });
        return;
      }

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessMessage('同步作业创建成功！正在跳转...');
        
        setTimeout(() => {
          router.push('/sync-jobs');
        }, 1500);
      } else {
        const errorMessage = result.error || '创建失败，请重试';
        
        if (response.status === 400) {
          setErrors({ submit: `配置错误: ${errorMessage}` });
        } else if (response.status === 409) {
          setErrors({ submit: `作业名称已存在，请使用其他名称` });
        } else if (response.status === 500) {
          setErrors({ submit: `服务器错误: ${errorMessage}` });
        } else {
          setErrors({ submit: errorMessage });
        }
      }
    } catch (error) {
      console.error('创建同步作业失败:', error);
      setErrors({ submit: '网络错误，请检查连接后重试' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header showPageTitle={false} />

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                  创建新的同步作业
                </h3>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  配置数据库到企业微信的同步任务。请填写作业信息、选择数据映射配置、设置同步周期和冲突处理策略。
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 p-6 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                基本信息
              </h2>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  作业名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="例如：用户数据同步"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="简要描述该同步作业的用途"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  同步模式
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, syncMode: 'full' }))}
                    className={`rounded-lg border-2 p-4 text-center transition-all ${
                      formData.syncMode === 'full'
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl mb-2">🔄</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">全量同步</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">每次同步全部数据</div>
                  </button>
                  <button disabled
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, syncMode: 'incremental' }))}
                    className={`rounded-lg border-2 p-4 text-center transition-all ${
                      formData.syncMode === 'incremental'
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl mb-2">📈</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">增量同步(暂不开放)</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">仅同步新增或变更数据</div>
                  </button>
                  <button disabled
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, syncMode: 'paged' }))}
                    className={`rounded-lg border-2 p-4 text-center transition-all ${
                      formData.syncMode === 'paged'
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl mb-2">📄</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">分页同步(暂不开放)</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">分批次同步大量数据</div>
                  </button>
                </div>
              </div>

              {formData.syncMode === 'incremental' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    增量类型
                  </label>
                  <select
                    value={formData.incrementalType}
                    onChange={(e) => setFormData(prev => ({ ...prev, incrementalType: e.target.value as IncrementalType }))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="timestamp">时间戳</option>
                    <option value="id">自增ID</option>
                    <option value="custom">自定义字段</option>
                  </select>
                </div>
              )}

              {formData.syncMode === 'incremental' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    增量字段 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.incrementalField}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, incrementalField: e.target.value }));
                      setErrors(prev => ({ ...prev, incrementalField: '' }));
                    }}
                    placeholder="例如：updated_at"
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                      errors.incrementalField ? 'border-red-500' : ''
                  }`}
                  />
                  {errors.incrementalField && (
                    <p className="mt-1 text-sm text-red-600">{errors.incrementalField}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <label htmlFor="enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  启用此作业
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 p-6 dark:border-gray-700">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                数据映射配置
              </h2>
              <MappingSelector
                selectedMappingId={formData.mappingConfigId}
                onMappingChange={handleMappingChange}
                error={errors.mappingConfigId}
              />
            </div>

            <div className="border-t border-gray-200 p-6 dark:border-gray-700">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                同步周期配置
              </h2>
              <ScheduleConfig
                schedule={formData.schedule}
                scheduleTemplate={formData.scheduleTemplate}
                onScheduleChange={handleScheduleChange}
                error={errors.schedule}
              />
            </div>

            <div className="border-t border-gray-200 p-6 dark:border-gray-700">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                冲突处理策略
              </h2>
              <ConflictStrategyConfig
                globalStrategy={formData.conflictStrategy}
                fieldMappings={selectedMapping?.fieldMappings || []}
                fieldConflictStrategies={formData.fieldConflictStrategies}
                onChange={handleConflictStrategyChange}
                error={errors.conflictStrategy}
              />
            </div>

            <div className="border-t border-gray-200 p-6 dark:border-gray-700">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                高级配置
              </h2>
              <PaginationConfig disabled
                syncMode={formData.syncMode}
                pageSize={formData.pageSize}
                enableResume={formData.enableResume}
                syncTimeout={formData.syncTimeout}
                maxRecordsPerSync={formData.maxRecordsPerSync}
                enableDataValidation={formData.enableDataValidation}
                onChange={handlePaginationConfigChange}
                error={errors.pagination}
              />
            </div>

            {successMessage && (
              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-green-900 dark:text-green-300">
                    {successMessage}
                  </p>
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="text-sm font-medium text-red-900 dark:text-red-300">
                    {errors.submit}
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 p-6 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  返回
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      创建作业
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
