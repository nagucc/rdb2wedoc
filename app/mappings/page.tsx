'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Database,
  FileText,
  Settings,
  Search,
  Filter,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  LogOut,
  Clock
} from 'lucide-react';
import { authService } from '@/lib/services/authService';
import { MappingConfigUI, FieldMappingUI, SyncJob } from '@/types';

interface DatabaseConnection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  database: string;
}

interface IntelligentDocument {
  id: string;
  name: string;
  accountId: string;
  status: string;
  sheetCount: number;
  sheets?: {
    id: string;
    name: string;
  }[];
  createdAt: string;
  lastSyncTime?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export default function MappingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [mappings, setMappings] = useState<MappingConfigUI[]>([]);
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [documents, setDocuments] = useState<IntelligentDocument[]>([]);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'draft'>('all');
  const [previewMode, setPreviewMode] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [showJobsDialog, setShowJobsDialog] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<MappingConfigUI | null>(null);
  const [selectedMappingForJobs, setSelectedMappingForJobs] = useState<MappingConfigUI | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState<MappingConfigUI | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedMappingId, setExpandedMappingId] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

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

  const fetchDatabases = async () => {
    try {
      const response = await fetch('/api/databases');
      const data: ApiResponse<DatabaseConnection[]> = await response.json();
      if (data.success && data.data) {
        setDatabases(data.data);
      }
    } catch (err) {
      console.error('Error fetching databases:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const accountsResponse = await fetch('/api/wecom-accounts');
      const accountsData = await accountsResponse.json();
      
      if (accountsData.success && accountsData.data) {
        const allDocuments: IntelligentDocument[] = [];
        for (const account of accountsData.data) {
          const docsResponse = await fetch(`/api/wecom-accounts/${account.id}/documents`);
          const docsData = await docsResponse.json();
          if (docsData.success && docsData.data) {
            allDocuments.push(...docsData.data);
          }
        }
        setDocuments(allDocuments);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data: ApiResponse<SyncJob[]> = await response.json();
      if (data.success && data.data) {
        setJobs(data.data);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  const resolveSourceName = (sourceDatabaseId: string, sourceTableName: string): string => {
    try {
      const db = databases.find(d => d.id === sourceDatabaseId);
      if (db) {
        return `${db.name}.${sourceTableName}`;
      }
      return `${sourceDatabaseId}.${sourceTableName}`;
    } catch (error) {
      console.error('Error resolving source name:', error);
      return `${sourceDatabaseId}.${sourceTableName}`;
    }
  };

  const resolveTargetName = (targetDocId: string, targetSheetId: string): string => {
    try {
      const doc = documents.find(d => d.id === targetDocId);
      if (doc) {
        const sheet = doc.sheets?.find((s) => s.id === targetSheetId);
        const sheetName = sheet ? sheet.name : targetSheetId;
        return `${doc.name}:${sheetName}`;
      }
      return `${targetDocId}:${targetSheetId}`;
    } catch (error) {
      console.error('Error resolving target name:', error);
      return `${targetDocId}:${targetSheetId}`;
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    fetchMappings();
    fetchDatabases();
    fetchDocuments();
    fetchJobs();
  }, [router]);

  const handleDeleteMapping = async (id: string) => {
    if (!confirm('确定要删除此映射配置吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/mappings?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<void> = await response.json();

      if (data.success) {
        fetchMappings();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除映射配置失败';
      alert(errorMessage);
      console.error(errorMessage, err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      case 'draft':
        return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '启用';
      case 'inactive':
        return '禁用';
      case 'draft':
        return '草稿';
      default:
        return status;
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

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400';
      case 'running':
        return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'pending':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getJobStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'running':
        return '运行中';
      case 'pending':
        return '等待中';
      default:
        return status;
    }
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getJobsForMapping = (mappingId: string) => {
    return jobs.filter(job => job.mappingConfigId === mappingId);
  };

  const filteredMappings = mappings.filter(mapping => {
    const resolvedSourceName = resolveSourceName(mapping.sourceDatabaseId, mapping.sourceTableName);
    const resolvedTargetName = resolveTargetName(mapping.targetDocId, mapping.targetSheetId);
    const matchesSearch = mapping.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resolvedSourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resolvedTargetName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || mapping.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: mappings.length,
    active: mappings.filter(m => m.status === 'active').length,
    inactive: mappings.filter(m => m.status === 'inactive').length,
    draft: mappings.filter(m => m.status === 'draft').length
  };

  if (loading && mappings.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 dark:border-gray-700 dark:bg-gray-800">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && mappings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 dark:border-gray-700 dark:bg-gray-800">
        <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          加载失败
        </h3>
        <p className="mb-4 text-center text-gray-600 dark:text-gray-400">
          {error}
        </p>
        <button
          onClick={fetchMappings}
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
                  数据库到企业微信文档同步系统
                </p>
              </div>
            </Link>
            <nav className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 dark:bg-blue-900/20">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  数据映射
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
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  数据映射管理
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  管理数据源与目标之间的字段映射关系
                </p>
              </div>
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
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                新建映射
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">总映射</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">启用</span>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">禁用</span>
              </div>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.inactive}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">草稿</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.draft}</p>
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

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'draft')}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">全部状态</option>
                <option value="active">启用</option>
                <option value="inactive">禁用</option>
                <option value="draft">草稿</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {filteredMappings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Database className="mb-4 h-16 w-16 text-gray-400" />
                <h4 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  暂无数据映射
                </h4>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {mappings.length === 0 ? '点击上方按钮创建第一个数据映射' : '没有找到匹配的数据映射'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white">{mapping.name}</h4>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(mapping.status)}`}>
                            {getStatusText(mapping.status)}
                          </span>
                          <div className="flex items-center gap-2 ml-2">
                            <button
                              onClick={() => router.push(`/mappings/edit/${mapping.id}`)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:bg-blue-900/20"
                              title="编辑"
                            >
                              <Edit className="h-4 w-4" />
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteMapping(mapping.id)}
                              disabled={getJobsForMapping(mapping.id).length > 0}
                              className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                getJobsForMapping(mapping.id).length > 0
                                  ? 'text-gray-400 cursor-not-allowed dark:text-gray-600'
                                  : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                              }`}
                              title={getJobsForMapping(mapping.id).length > 0 ? '该映射被同步作业引用，无法删除' : '删除'}
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Database className="h-4 w-4" />
                            {resolveSourceName(mapping.sourceDatabaseId, mapping.sourceTableName)} <ArrowRight className="h-4 w-4" /> {resolveTargetName(mapping.targetDocId, mapping.targetSheetId)}
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
                          {(() => {
                            const mappingJobs = getJobsForMapping(mapping.id);
                            if (mappingJobs.length === 0) return null;
                            return (
                              <span 
                                onClick={() => {
                                  setSelectedMappingForJobs(mapping);
                                  setShowJobsDialog(true);
                                }}
                                className="flex items-center gap-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                <RefreshCw className="h-4 w-4" />
                                {mappingJobs.length} 个同步作业
                              </span>
                            );
                          })()}
                        </div>
                        {expandedMappingId === mapping.id && (() => {
                          const mappingJobs = getJobsForMapping(mapping.id);
                          if (mappingJobs.length === 0) return null;
                          return (
                            <div className="mt-4 ml-6 space-y-2">
                              {mappingJobs.map((job) => (
                                <div
                                  key={job.id}
                                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getJobStatusColor(job.status)}`}>
                                      {getJobStatusText(job.status)}
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">{job.name}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {job.schedule}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                    {job.lastRun && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(job.lastRun)}
                                      </span>
                                    )}
                                    {job.nextRun && (
                                      <span className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        下次: {formatDate(job.nextRun)}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => router.push(`/sync-jobs`)}
                                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                      <Eye className="h-3 w-3" />
                                      查看详情
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>创建时间: {new Date(mapping.createdAt).toLocaleString()}</span>
                        <span>更新时间: {new Date(mapping.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {showFieldMapping && selectedMapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  字段映射配置
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedMapping.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFieldMapping(false);
                  setSelectedMapping(null);
                }}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {selectedMapping.fieldMappings.map((fieldMapping) => (
                  <div
                    key={fieldMapping.id}
                    className="flex items-center gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50"
                  >
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {fieldMapping.databaseColumn}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {fieldMapping.documentField}
                        </span>
                        {fieldMapping.required && (
                          <span className="text-xs text-red-600 dark:text-red-400">必填</span>
                        )}
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
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                          {fieldMapping.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showJobsDialog && selectedMappingForJobs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  同步作业
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedMappingForJobs.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowJobsDialog(false);
                  setSelectedMappingForJobs(null);
                }}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {(() => {
                  const mappingJobs = getJobsForMapping(selectedMappingForJobs.id);
                  if (mappingJobs.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                        <RefreshCw className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm">暂无同步作业</p>
                      </div>
                    );
                  }
                  return mappingJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getJobStatusColor(job.status)}`}>
                            {getJobStatusIcon(job.status)}
                            <span className="ml-1">{getJobStatusText(job.status)}</span>
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{job.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/sync-jobs`)}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                          >
                            <Eye className="h-3 w-3" />
                            查看详情
                          </button>
                        </div>
                      </div>

                      <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>调度: {job.schedule}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <RefreshCw className="h-4 w-4" />
                          <span>模式: {job.syncMode}</span>
                        </div>
                      </div>

                      <div className="mb-3 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        {job.lastRun && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            上次运行: {formatDate(job.lastRun)}
                          </span>
                        )}
                        {job.nextRun && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            下次运行: {formatDate(job.nextRun)}
                          </span>
                        )}
                      </div>

                      {job.description && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                          {job.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">冲突策略:</span>
                          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-300">
                            {job.conflictStrategy}
                          </span>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
