'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, RefreshCw, AlertCircle, PlayCircle, PauseCircle, CheckCircle, XCircle, Clock, Database, FileText, Settings, FileText as FileIcon, ChevronRight, ChevronDown, Info, History } from 'lucide-react';
import { authService } from '@/lib/services/authService';
import { SyncJob, SyncStatus, MappingConfig, ExecutionLog } from '@/types';
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
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedJobLogs, setSelectedJobLogs] = useState<ExecutionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const [logsPageSize] = useState(10);
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
      
      if (!response.ok) {
        setError('获取同步作业列表失败');
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setError('服务器返回了非JSON响应');
        return;
      }

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
      
      if (!response.ok) {
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return;
      }

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
      
      if (!response.ok) {
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return;
      }

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
      
      if (!response.ok) {
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return;
      }

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

  useEffect(() => {
    const handleRouteChange = () => {
      fetchJobs();
      fetchDatabases();
      fetchDocuments();
      fetchMappingConfigs();
    };

    window.addEventListener('focus', handleRouteChange);
    return () => window.removeEventListener('focus', handleRouteChange);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = '同步作业管理 - RDB2WeDoc';
    }
  }, []);

  const handleCreate = () => {
    router.push('/sync-jobs/create');
  };

  const handleEdit = (job: SyncJob) => {
    router.push(`/sync-jobs/edit/${job.id}`);
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

  const handleToggleStatus = async (jobId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: !enabled })
      });

      if (!response.ok) {
        alert('操作失败');
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        alert('服务器返回了非JSON响应');
        return;
      }

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

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('服务器返回了非JSON响应');
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
        
        if (!response.ok) {
          attempts++;
          setTimeout(poll, interval);
          return;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          attempts++;
          setTimeout(poll, interval);
          return;
        }

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
      setLogsCurrentPage(1);
      const response = await fetch(`/api/jobs/${jobId}/logs`);
      
      if (!response.ok) {
        alert('获取日志失败');
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        alert('服务器返回了非JSON响应');
        return;
      }

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
      <Header 
        showPageTitle={false} 
        breadcrumbItems={[
          { title: '控制台', href: '/dashboard' },
          { title: '同步作业管理', href: '/sync-jobs', isActive: true }
        ]} 
      />

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
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-500">
                              {job.lastRun && (
                                <span>
                                  最后执行: {new Date(job.lastRun).toLocaleString('zh-CN')}
                                </span>
                              )}
                              <span>
                                同步周期: {job.scheduleTemplate || job.schedule}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewLogs(job.id);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              <History className="h-4 w-4" />
                              日志
                            </button>
                            {job.status !== 'running' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(job.id, job.enabled);
                                }}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExecuteJob(job.id);
                                }}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(job);
                              }}
                              title={job.status === 'running' ? '作业运行中，此操作暂时不可用' : ''}
                              disabled={job.status === 'running'}
                              className="flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Edit className="h-4 w-4" />
                              编辑
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(job.id);
                              }}
                              title={job.status === 'running' ? '作业运行中，此操作暂时不可用' : ''}
                              disabled={job.status === 'running'}
                              className="flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
                          {database ? (
                            <Link
                              href={`/databases/${database.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                              <Database className="h-4 w-4" />
                              {database.name}
                            </Link>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Database className="h-4 w-4" />
                              {mappingConfig?.sourceDatabaseId || '未知数据源'}
                            </span>
                          )}
                          {document ? (
                            <Link
                              href={`/dashboard/wecom-accounts/${document.accountId}/documents/${document.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                              <FileIcon className="h-4 w-4" />
                              {document.name}
                            </Link>
                          ) : (
                            <span className="flex items-center gap-1">
                              <FileIcon className="h-4 w-4" />
                              {mappingConfig?.targetDocId || '未知文档'}
                            </span>
                          )}
                          {mappingConfig ? (
                            <Link
                              href={`/mappings/edit/${job.mappingConfigId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                              <Settings className="h-4 w-4" />
                              {mappingConfig.sourceTableName || '未知'} → {mappingConfig.sheetName || mappingConfig.targetSheetId || '未知'}
                            </Link>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Settings className="h-4 w-4" />
                              未知 → 未知
                            </span>
                          )}
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

      {showLogsModal && (() => {
        const totalPages = Math.ceil(selectedJobLogs.length / logsPageSize);
        const startIndex = (logsCurrentPage - 1) * logsPageSize;
        const endIndex = startIndex + logsPageSize;
        const currentLogs = selectedJobLogs.slice(startIndex, endIndex);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="mx-4 w-full max-w-4xl max-h-[80vh] rounded-2xl bg-white shadow-2xl dark:bg-gray-800 flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                    <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      执行日志
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      共 {selectedJobLogs.length} 条记录
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  关闭
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                {loadingLogs ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : selectedJobLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <FileText className="h-16 w-16 mb-4" />
                    <p>暂无日志记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentLogs.map((log, index) => (
                      <div
                        key={startIndex + index}
                        className={`rounded-lg p-4 border ${
                          log.status === 'success'
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                            : log.status === 'failed'
                            ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
                            : 'bg-gray-50 border-gray-200 dark:bg-gray-900/10 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              #{startIndex + index + 1} · {log.startTime ? new Date(log.startTime).toLocaleString('zh-CN') : '-'}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              log.status === 'success'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : log.status === 'failed'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                              {log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '运行中'}
                            </span>
                          </div>
                          {log.duration && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              耗时: {(log.duration / 1000).toFixed(2)}s
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                          <div>
                            <span className="font-medium">处理记录:</span> {log.recordsProcessed}
                          </div>
                          <div>
                            <span className="font-medium text-green-600">成功:</span> {log.recordsSucceeded}
                          </div>
                          <div>
                            <span className="font-medium text-red-600">失败:</span> {log.recordsFailed}
                          </div>
                          {log.recordsSkipped !== undefined && (
                            <div>
                              <span className="font-medium text-gray-500">跳过:</span> {log.recordsSkipped}
                            </div>
                          )}
                        </div>
                        {log.errorMessage && (
                          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded p-2 mt-2">
                            {log.errorMessage}
                          </div>
                        )}
                        {(log.syncMode || log.pageSize || log.currentPage) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/50 rounded p-2 mt-2">
                            {log.syncMode && <span>同步模式: {log.syncMode === 'full' ? '全量' : log.syncMode === 'incremental' ? '增量' : '分页'} </span>}
                            {log.pageSize && <span> | 每页: {log.pageSize}条 </span>}
                            {log.currentPage && log.totalPages && <span> | 进度: {log.currentPage}/{log.totalPages}</span>}
                            {log.conflictCount !== undefined && log.conflictCount > 0 && <span> | 冲突: {log.conflictCount}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    第 {logsCurrentPage} / {totalPages} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLogsCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={logsCurrentPage === 1}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                      上一页
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (logsCurrentPage <= 3) {
                          pageNum = i + 1;
                        } else if (logsCurrentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = logsCurrentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setLogsCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              logsCurrentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setLogsCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={logsCurrentPage === totalPages}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      下一页
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
