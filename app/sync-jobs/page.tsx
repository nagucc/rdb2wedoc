'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, RefreshCw, AlertCircle, PlayCircle, PauseCircle, CheckCircle, XCircle, Clock, Database, FileText, Settings, FileText as FileIcon, ChevronRight, ChevronDown, Info, History } from 'lucide-react';
import { authService } from '@/lib/services/authService';
import { SyncJob, SyncStatus, ConflictStrategy, SyncMode, IncrementalType, FieldConflictStrategy, MappingConfig, FieldMapping, ExecutionLog } from '@/types';
import MappingSelector from '@/components/sync-jobs/MappingSelector';
import ScheduleConfig from '@/components/sync-jobs/ScheduleConfig';
import ConflictStrategyConfig from '@/components/sync-jobs/ConflictStrategyConfig';
import PaginationConfig from '@/components/sync-jobs/PaginationConfig';
import Header from '@/components/layout/Header';

interface DatabaseConfig {
  id: string;
  name: string;
  type: string;
  host: string;
  port: string;
  username: string;
  database: string;
  enabled: boolean;
}

interface DocumentConfig {
  id: string;
  name: string;
  status: string;
  sheetCount: number;
  accountId: string;
}

export default function SyncJobsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [databases, setDatabases] = useState<DatabaseConfig[]>([]);
  const [documents, setDocuments] = useState<DocumentConfig[]>([]);
  const [mappingConfigs, setMappingConfigs] = useState<MappingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<SyncJob | null>(null);
  const [selectedMappingConfig, setSelectedMappingConfig] = useState<MappingConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mappingConfigId: '',
    schedule: '0 0 * * *',
    scheduleTemplate: '',
    conflictStrategy: 'overwrite' as ConflictStrategy,
    syncMode: 'full' as SyncMode,
    incrementalType: 'timestamp' as IncrementalType,
    incrementalField: '',
    pageSize: 1000,
    enableResume: true,
    lastSyncPosition: '',
    fieldConflictStrategies: [] as Array<{ fieldName: string; strategy: FieldConflictStrategy }>,
    syncTimeout: 300,
    maxRecordsPerSync: 10000,
    enableDataValidation: true,
    enabled: true
  });
  const [processing, setProcessing] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedJobLogs, setSelectedJobLogs] = useState<ExecutionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<SyncJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [executingJobId, setExecutingJobId] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/jobs');
      const data = await response.json();

      if (data.success) {
        setJobs(data.data || []);
      } else {
        setError(data.error || '获取同步作业列表失败');
      }
    } catch (err) {
      setError('网络错误，请检查连接后重试');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabases = async () => {
    try {
      const response = await fetch('/api/databases');
      const data = await response.json();

      if (data.success) {
        setDatabases(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching databases:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const fetchMappingConfigs = async () => {
    try {
      const response = await fetch('/api/mappings');
      const data = await response.json();

      if (data.success) {
        setMappingConfigs(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching mapping configs:', err);
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    fetchJobs();
    fetchDatabases();
    fetchDocuments();
    fetchMappingConfigs();
  }, [router]);

  const handleMappingConfigChange = (mappingConfigId: string) => {
    const config = mappingConfigs.find(m => m.id === mappingConfigId);
    if (config) {
      setSelectedMappingConfig(config);
      setFormData({
        ...formData,
        mappingConfigId: config.id
      });
    } else {
      setSelectedMappingConfig(null);
      setFormData({
        ...formData,
        mappingConfigId: ''
      });
    }
  };

  const handleCreate = () => {
    setEditingJob(null);
    setSelectedMappingConfig(null);
    setFormData({
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
    setShowModal(true);
  };

  const handleEdit = (job: SyncJob) => {
    setEditingJob(job);
    const config = mappingConfigs.find(m => m.id === job.mappingConfigId);
    setSelectedMappingConfig(config || null);
    setFormData({
      name: job.name,
      description: job.description || '',
      mappingConfigId: job.mappingConfigId || '',
      schedule: job.schedule,
      scheduleTemplate: job.scheduleTemplate || '',
      conflictStrategy: job.conflictStrategy,
      syncMode: job.syncMode || 'full',
      incrementalType: job.incrementalType || 'timestamp',
      incrementalField: job.incrementalField || '',
      pageSize: job.pageSize || 1000,
      enableResume: job.enableResume ?? true,
      lastSyncPosition: job.lastSyncPosition || '',
      fieldConflictStrategies: job.fieldConflictStrategies || [],
      syncTimeout: job.syncTimeout || 300,
      maxRecordsPerSync: job.maxRecordsPerSync || 10000,
      enableDataValidation: job.enableDataValidation ?? true,
      enabled: job.enabled
    });
    setShowModal(true);
  };

  const handleDelete = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    setJobToDelete(job);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!jobToDelete) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/jobs?id=${jobToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('响应格式错误：期望JSON格式');
      }

      const text = await response.text();
      if (!text) {
        throw new Error('服务器返回空响应');
      }

      const data = JSON.parse(text);

      if (data.success) {
        fetchJobs();
        setShowDeleteDialog(false);
        setJobToDelete(null);
      } else {
        alert(data.error || '删除失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '网络错误，请检查连接后重试';
      alert(errorMessage);
      console.error('Error deleting job:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setJobToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setProcessing(true);

      // 客户端验证
      if (!formData.name || formData.name.trim() === '') {
        alert('请输入作业名称');
        return;
      }

      if (!formData.mappingConfigId || formData.mappingConfigId.trim() === '') {
        alert('请选择数据映射配置');
        return;
      }

      const url = '/api/jobs';
      const method = editingJob ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          id: editingJob?.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        fetchJobs();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (err) {
      alert('网络错误，请检查连接后重试');
      console.error('Error saving job:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (jobId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: !enabled })
      });

      const data = await response.json();

      if (data.success) {
        fetchJobs();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (err) {
      alert('网络错误，请检查连接后重试');
      console.error('Error toggling job status:', err);
    }
  };

  const handleExecuteJob = async (jobId: string) => {
    try {
      setExecutingJobId(jobId);

      setJobs(prevJobs =>
        prevJobs.map(j =>
          j.id === jobId ? { ...j, status: 'running' } : j
        )
      );

      const response = await fetch(`/api/jobs/${jobId}/execute`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        pollJobStatus(jobId);
      } else {
        setJobs(prevJobs =>
          prevJobs.map(j =>
            j.id === jobId ? { ...j, status: 'idle' } : j
          )
        );
        alert(data.error || '执行失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '网络错误，请检查连接后重试';
      alert(errorMessage);
      console.error('Error executing job:', err);
      setJobs(prevJobs =>
        prevJobs.map(j =>
          j.id === jobId ? { ...j, status: 'idle' } : j
        )
      );
    } finally {
      setExecutingJobId(null);
    }
  };

  const pollJobStatus = async (jobId: string, maxAttempts: number = 60, interval: number = 2000) => {
    let attempts = 0;

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        console.warn(`轮询作业状态超时: ${jobId}`);
        return;
      }

      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();

        if (data.success && data.data) {
          const job = data.data;

          if (job.status === 'idle' || job.status === 'success' || job.status === 'failed') {
            setJobs(prevJobs =>
              prevJobs.map(j =>
                j.id === jobId ? { ...j, status: job.status } : j
              )
            );
            return;
          }

          if (job.status === 'running') {
            setJobs(prevJobs =>
              prevJobs.map(j =>
                j.id === jobId ? { ...j, status: 'running' } : j
              )
            );
            attempts++;
            setTimeout(poll, interval);
          }
        }
      } catch (error) {
        console.error('轮询作业状态失败:', error);
        attempts++;
        setTimeout(poll, interval);
      }
    };

    poll();
  };

  const handleViewLogs = async (jobId: string) => {
    try {
      setLoadingLogs(true);
      const response = await fetch(`/api/jobs/${jobId}/logs`);
      const data = await response.json();

      if (data.success) {
        setSelectedJobLogs(data.data || []);
        setShowLogsModal(true);
      } else {
        alert(data.error || '获取日志失败');
      }
    } catch (err) {
      alert('网络错误，请检查连接后重试');
      console.error('Error fetching logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const toggleJobExpand = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'success':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'paused':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      case 'resuming':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <PlayCircle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'paused':
        return <PauseCircle className="h-4 w-4" />;
      case 'resuming':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      idle: '空闲',
      running: '运行中',
      success: '成功',
      failed: '失败',
      paused: '已暂停',
      resuming: '恢复中'
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          加载失败
        </h3>
        <p className="mb-4 text-center text-gray-600 dark:text-gray-400">
          {error}
        </p>
        <button
          onClick={fetchJobs}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header showPageTitle={true} pageTitle="同步作业管理" />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  同步作业管理
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  管理和监控所有数据库到企业微信的同步作业
                </p>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              新建作业
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">总作业数</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{jobs.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">运行中</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{jobs.filter(j => j.status === 'running').length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">失败</span>
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{jobs.filter(j => j.status === 'failed').length}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 p-6 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    作业列表
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    共 {jobs.length} 个同步作业
                  </p>
                </div>
                <button
                  onClick={fetchJobs}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  刷新
                </button>
              </div>
            </div>

            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Database className="mb-4 h-16 w-16 text-gray-400" />
                <h4 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  暂无同步作业
                </h4>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  点击上方按钮创建第一个同步作业
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {jobs.map((job) => {
                  const mappingConfig = mappingConfigs.find(m => m.id === job.mappingConfigId);
                  const database = mappingConfig ? databases.find(d => d.id === mappingConfig.sourceDatabaseId) : null;
                  const document = mappingConfig ? documents.find(d => d.id === mappingConfig.targetDocId) : null;
                  const isExpanded = expandedJobs.has(job.id);
                  
                  return (
                    <div
                      key={job.id}
                      className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <button
                                onClick={() => toggleJobExpand(job.id)}
                                className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                                  {job.name}
                                </h4>
                              </button>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(job.status)}`}>
                                {getStatusIcon(job.status)}
                                {getStatusText(job.status)}
                              </span>
                              {job.syncMode && job.syncMode !== 'full' && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  {job.syncMode === 'incremental' ? '增量' : '分页'}
                                </span>
                              )}
                            </div>
                            {job.lastRun && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                最后执行: {new Date(job.lastRun).toLocaleString('zh-CN')}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewLogs(job.id)}
                              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              <History className="h-4 w-4" />
                              日志
                            </button>
                            {job.status !== 'running' && (
                              <button
                                onClick={() => handleToggleStatus(job.id, job.enabled)}
                                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                  job.enabled
                                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                                }`}
                              >
                                {job.enabled ? (
                                  <>
                                    <PauseCircle className="h-4 w-4" />
                                    禁用
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="h-4 w-4" />
                                    启用
                                  </>
                                )}
                              </button>
                            )}
                            {job.enabled && job.status !== 'running' && (
                              <button
                                onClick={() => handleExecuteJob(job.id)}
                                disabled={executingJobId === job.id}
                                className="flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {executingJobId === job.id ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    执行中...
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="h-4 w-4" />
                                    立即执行
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(job)}
                              className="flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            >
                              <Edit className="h-4 w-4" />
                              编辑
                            </button>
                            <button
                              onClick={() => handleDelete(job.id)}
                              className="flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
                          <span className="flex items-center gap-1">
                            <Database className="h-4 w-4" />
                            {database?.name || mappingConfig?.sourceDatabaseId || '未知数据源'}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileIcon className="h-4 w-4" />
                            {document?.name || mappingConfig?.targetDocId || '未知文档'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Settings className="h-4 w-4" />
                            {mappingConfig?.sourceTableName || '未知'} → {mappingConfig?.sheetName || mappingConfig?.targetSheetId || '未知'}
                          </span>
                          {job.mappingConfigId && (
                            <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded">
                              使用映射配置
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">调度规则</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{job.schedule}</div>
                              {job.scheduleTemplate && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">{job.scheduleTemplate}</div>
                              )}
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">冲突策略</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{job.conflictStrategy}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">同步模式</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {job.syncMode === 'full' ? '全量' : job.syncMode === 'incremental' ? '增量' : '分页'}
                              </div>
                              {job.syncMode === 'paged' && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  每页 {job.pageSize} 条
                                </div>
                              )}
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">重试次数</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {job.retryCount} / {job.maxRetries}
                              </div>
                            </div>
                          </div>
                          {job.description && (
                            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-xs font-medium text-blue-900 dark:text-blue-100">描述</div>
                                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">{job.description}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="mx-4 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h3 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
              {editingJob ? '编辑同步作业' : '新建同步作业'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  基本信息
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      作业名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="输入作业名称"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      作业描述
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="输入作业描述"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  数据映射配置
                </h4>
                <div className="space-y-4">
                  <MappingSelector
                    selectedMappingId={formData.mappingConfigId}
                    onMappingChange={(mappingId) => {
                      setFormData({
                        ...formData,
                        mappingConfigId: mappingId
                      });
                    }}
                  />
                </div>
              </div>

              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  同步周期配置
                </h4>
                <ScheduleConfig
                  schedule={formData.schedule}
                  scheduleTemplate={formData.scheduleTemplate}
                  onScheduleChange={(schedule, template) => {
                    setFormData({
                      ...formData,
                      schedule,
                      scheduleTemplate: template || ''
                    });
                  }}
                />
              </div>

              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings className="h-4 w-4 text-orange-600" />
                  冲突解决策略
                </h4>
                <ConflictStrategyConfig
                  globalStrategy={formData.conflictStrategy}
                  fieldMappings={selectedMappingConfig?.fieldMappings || []}
                  fieldConflictStrategies={formData.fieldConflictStrategies}
                  onChange={(globalStrategy, fieldStrategies) => {
                    setFormData({
                      ...formData,
                      conflictStrategy: globalStrategy,
                      fieldConflictStrategies: fieldStrategies || []
                    });
                  }}
                />
              </div>

              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-cyan-600" />
                  大数据量处理
                </h4>
                <PaginationConfig
                  syncMode={formData.syncMode}
                  incrementalType={formData.incrementalType}
                  incrementalField={formData.incrementalField}
                  pageSize={formData.pageSize}
                  enableResume={formData.enableResume}
                  maxRecordsPerSync={formData.maxRecordsPerSync}
                  onChange={(config) => {
                    setFormData({
                      ...formData,
                      ...config
                    });
                  }}
                />
              </div>

              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-600" />
                  执行监控配置
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      同步超时时间（秒）
                    </label>
                    <input
                      type="number"
                      value={formData.syncTimeout}
                      onChange={(e) => setFormData({ ...formData, syncTimeout: parseInt(e.target.value) || 300 })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      min={60}
                      max={3600}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      超过此时间将自动取消同步任务
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      单次同步最大记录数
                    </label>
                    <input
                      type="number"
                      value={formData.maxRecordsPerSync}
                      onChange={(e) => setFormData({ ...formData, maxRecordsPerSync: parseInt(e.target.value) || 10000 })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      min={100}
                      max={100000}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      限制单次同步的记录数量
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="enableDataValidation"
                        checked={formData.enableDataValidation}
                        onChange={(e) => setFormData({ ...formData, enableDataValidation: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="enableDataValidation" className="text-sm text-gray-700 dark:text-gray-300">
                        启用数据验证（同步前验证数据完整性）
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="enabled" className="text-sm text-gray-700 dark:text-gray-300">
                    启用作业
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? '处理中...' : editingJob ? '更新' : '创建'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteDialog && jobToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  确认删除
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  是否确认删除？此操作不可撤销
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <div className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                作业名称
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {jobToDelete.name}
              </div>
              {jobToDelete.description && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {jobToDelete.description}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    删除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    确认删除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
