'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, RefreshCw, AlertCircle, PlayCircle, PauseCircle, CheckCircle, XCircle, Clock, User, LogOut, Database, FileText, Settings } from 'lucide-react';
import { authService } from '@/lib/services/authService';

interface SyncJob {
  id: string;
  name: string;
  databaseId: string;
  documentId: string;
  table: string;
  sheetId: string;
  fieldMappings: Array<{
    sourceField: string;
    targetField: string;
    documentFieldId?: string;
  }>;
  schedule: string;
  conflictStrategy: 'overwrite' | 'skip' | 'merge';
  status: 'idle' | 'running' | 'success' | 'failed' | 'paused';
  enabled: boolean;
  retryCount: number;
  maxRetries: number;
  lastExecutionTime?: string;
  nextExecutionTime?: string;
  createdAt: string;
  updatedAt: string;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<SyncJob | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    databaseId: '',
    documentId: '',
    table: '',
    sheetId: '',
    schedule: '0 0 * * *',
    conflictStrategy: 'overwrite' as 'overwrite' | 'skip' | 'merge',
    enabled: true,
    fieldMappings: [] as Array<{ sourceField: string; targetField: string }>
  });
  const [processing, setProcessing] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

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
  }, [router]);

  const handleCreate = () => {
    setEditingJob(null);
    setFormData({
      name: '',
      databaseId: '',
      documentId: '',
      table: '',
      sheetId: '',
      schedule: '0 0 * * *',
      conflictStrategy: 'overwrite',
      enabled: true,
      fieldMappings: []
    });
    setShowModal(true);
  };

  const handleEdit = (job: SyncJob) => {
    setEditingJob(job);
    setFormData({
      name: job.name,
      databaseId: job.databaseId,
      documentId: job.documentId,
      table: job.table,
      sheetId: job.sheetId,
      schedule: job.schedule,
      conflictStrategy: job.conflictStrategy,
      enabled: job.enabled,
      fieldMappings: job.fieldMappings
    });
    setShowModal(true);
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('确定要删除这个同步作业吗？删除后无法恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs?id=${jobId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        fetchJobs();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (err) {
      alert('网络错误，请检查连接后重试');
      console.error('Error deleting job:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setProcessing(true);
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
      const response = await fetch(`/api/jobs/${jobId}/execute`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        fetchJobs();
      } else {
        alert(data.error || '执行失败');
      }
    } catch (err) {
      alert('网络错误，请检查连接后重试');
      console.error('Error executing job:', err);
    }
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
      paused: '已暂停'
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
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 transition-transform hover:scale-105 active:scale-95">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  RDB2WeDoc
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  数据库到企业微信智能表格同步系统
                </p>
              </div>
            </Link>
            <nav className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 dark:bg-blue-900/20">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  同步作业管理
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700">
                  <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {currentUser?.username || 'admin'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  退出
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

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
                <PlayCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">已启用</span>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{jobs.filter(j => j.enabled).length}</p>
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
                  const database = databases.find(d => d.id === job.databaseId);
                  const document = documents.find(d => d.id === job.documentId);
                  
                  return (
                    <div
                      key={job.id}
                      className="p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                              {job.name}
                            </h4>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(job.status)}`}>
                              {getStatusIcon(job.status)}
                              {getStatusText(job.status)}
                            </span>
                            {!job.enabled && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                                已禁用
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Database className="h-4 w-4" />
                              {database?.name || job.databaseId}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {document?.name || job.documentId}
                            </span>
                            <span className="flex items-center gap-1">
                              <Settings className="h-4 w-4" />
                              {job.table} → {job.sheetId}
                            </span>
                          </div>
                          {job.lastExecutionTime && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                              最后执行: {new Date(job.lastExecutionTime).toLocaleString('zh-CN')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
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
                              className="flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <PlayCircle className="h-4 w-4" />
                              立即执行
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h3 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
              {editingJob ? '编辑同步作业' : '新建同步作业'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    数据源 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.databaseId}
                    onChange={(e) => setFormData({ ...formData, databaseId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    required
                  >
                    <option value="">选择数据源</option>
                    {databases.map((db) => (
                      <option key={db.id} value={db.id}>
                        {db.name} ({db.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    智能表格 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.documentId}
                    onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    required
                  >
                    <option value="">选择智能表格</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    数据表 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.table}
                    onChange={(e) => setFormData({ ...formData, table: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="输入数据表名称"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    工作表ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.sheetId}
                    onChange={(e) => setFormData({ ...formData, sheetId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="输入工作表ID"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    调度规则 (Cron)
                  </label>
                  <input
                    type="text"
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="0 0 * * *"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    例如: 0 0 * * * (每天0点执行)
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    冲突策略
                  </label>
                  <select
                    value={formData.conflictStrategy}
                    onChange={(e) => setFormData({ ...formData, conflictStrategy: e.target.value as any })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="overwrite">覆盖</option>
                    <option value="skip">跳过</option>
                    <option value="merge">合并</option>
                  </select>
                </div>
              </div>

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

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? '处理中...' : editingJob ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
