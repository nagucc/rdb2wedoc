'use client';

import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  AlertCircle, 
  PlayCircle, 
  PauseCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Database,
  TrendingUp,
  Filter,
  ChevronDown,
  Search,
  Calendar,
  FileText
} from 'lucide-react';

interface SyncJob {
  id: string;
  name: string;
  source: string;
  target: string;
  status: 'running' | 'success' | 'failed' | 'pending' | 'paused';
  lastSyncTime: string;
  nextSyncTime: string;
  progress: number;
  recordsProcessed: number;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  avgExecutionTime: number;
}

interface SyncHistory {
  id: string;
  jobId: string;
  jobName: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'failed' | 'cancelled';
  recordsProcessed: number;
  errorMessage?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export default function SyncJobsModule() {
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'success' | 'failed' | 'pending' | 'paused'>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedJob, setSelectedJob] = useState<SyncJob | null>(null);

  const fetchSyncJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/jobs');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('响应格式错误：期望JSON格式');
      }

      const data: ApiResponse<any> = await response.json();

      if (data.success && data.data) {
        const jobsData = Array.isArray(data.data) ? data.data : (data.data.jobs || []);
        const historyData = data.data.history || [];
        
        setJobs(jobsData);
        setHistory(historyData);
      } else {
        setError(data.error || '获取同步作业失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '网络错误，无法获取同步作业数据';
      setError(errorMessage);
      console.error('Error fetching sync jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncJobs();
    const interval = setInterval(fetchSyncJobs, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleJobAction = async (jobId: string, action: 'start' | 'pause' | 'stop') => {
    try {
      const method = action === 'stop' ? 'PATCH' : 'POST';
      const response = await fetch(`/api/jobs/${jobId}`, {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('响应格式错误：期望JSON格式');
      }

      const data: ApiResponse<any> = await response.json();
      
      if (data.success) {
        fetchSyncJobs();
      } else {
        console.error(`${action} failed:`, data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Error ${action} job`;
      console.error(errorMessage, err);
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
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'paused':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      case 'idle':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-700';
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
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'paused':
        return <PauseCircle className="h-4 w-4" />;
      case 'idle':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'pending':
        return '等待中';
      case 'paused':
        return '已暂停';
      case 'idle':
        return '空闲';
      default:
        return status;
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.target.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: jobs.length,
    running: jobs.filter(j => j.status === 'running').length,
    success: jobs.filter(j => j.status === 'success').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    pending: jobs.filter(j => j.status === 'pending').length,
    paused: jobs.filter(j => j.status === 'paused').length
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载同步作业中...</p>
        </div>
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchSyncJobs}
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
          <RefreshCw className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">同步作业</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showHistory
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <Calendar className="h-4 w-4" />
            历史记录
          </button>
          <button
            onClick={fetchSyncJobs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">总作业</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <PlayCircle className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">运行中</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.running}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">成功</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.success}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">失败</span>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">等待中</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <PauseCircle className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">已暂停</span>
          </div>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.paused}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索作业名称、数据源或目标..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">全部状态</option>
            <option value="running">运行中</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
            <option value="pending">等待中</option>
            <option value="paused">已暂停</option>
            <option value="idle">空闲</option>
          </select>
        </div>
      </div>

      {showHistory ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 p-6 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  历史同步记录
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  共 {history.length} 条记录
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {history.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg dark:text-gray-400">暂无历史记录</p>
              </div>
            ) : (
              history.map((record) => (
                <div key={record.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">{record.jobName}</h4>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
                          {getStatusIcon(record.status)}
                          {getStatusText(record.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(record.startTime).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="h-4 w-4" />
                          {record.recordsProcessed} 条记录
                        </span>
                      </div>
                      {record.errorMessage && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                          错误: {record.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg dark:text-gray-400">没有找到匹配的同步作业</p>
              <p className="text-gray-400 text-sm mt-2">尝试调整筛选条件或重置搜索</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.name}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        {getStatusText(job.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Database className="h-4 w-4" />
                        {job.source} → {job.target}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        最后同步: {new Date(job.lastSyncTime).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === 'running' ? (
                      <button
                        onClick={() => handleJobAction(job.id, 'stop')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors text-sm"
                      >
                        <PauseCircle className="h-4 w-4" />
                        停止
                      </button>
                    ) : job.status === 'paused' ? (
                      <button
                        onClick={() => handleJobAction(job.id, 'start')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors text-sm"
                      >
                        <PlayCircle className="h-4 w-4" />
                        启动
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJobAction(job.id, 'start')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors text-sm"
                      >
                        <PlayCircle className="h-4 w-4" />
                        立即执行
                      </button>
                    )}
                  </div>
                </div>

                {job.status === 'running' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">同步进度</span>
                      <span className="font-medium text-gray-900 dark:text-white">{job.progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {job.recordsProcessed.toLocaleString()} / {job.totalRecords.toLocaleString()} 条记录
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">成功次数</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">{job.successCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">失败次数</p>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">{job.failureCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">平均执行时间</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{job.avgExecutionTime.toFixed(1)}s</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">下次同步</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Date(job.nextSyncTime).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
