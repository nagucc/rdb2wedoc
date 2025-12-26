'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, RefreshCw, AlertCircle, Building2, FileText, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { authService } from '@/lib/services/authService';

interface WeComAccount {
  id: string;
  name: string;
  corpId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IntelligentDocument {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'syncing';
  lastSyncTime?: string;
  sheetCount: number;
  createdAt: string;
}

export default function WeComAccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [account, setAccount] = useState<WeComAccount | null>(null);
  const [documents, setDocuments] = useState<IntelligentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'syncing'>('all');
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [newDocumentId, setNewDocumentId] = useState('');

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/wecom-accounts/${accountId}`);
      const data = await response.json();

      if (data.success) {
        setAccount(data.data);
        await fetchDocuments();
      } else {
        setError(data.error || '获取账号详情失败');
      }
    } catch (err) {
      setError('网络错误，请检查连接后重试');
      console.error('Error fetching account details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/wecom-accounts/${accountId}/documents`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const fetchDocumentName = async (documentId: string): Promise<string> => {
    try {
      const response = await fetch(`/api/wecom-accounts/${accountId}/documents/${documentId}/name`);
      const data = await response.json();

      if (data.success && data.data) {
        return data.data.name;
      }
      return `文档 ${documentId}`;
    } catch (err) {
      console.error('Error fetching document name:', err);
      return `文档 ${documentId}`;
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    fetchAccountDetails();
  }, [accountId, router]);

  const handleAddDocument = async () => {
    if (!newDocumentId.trim()) {
      alert('请输入文档ID');
      return;
    }

    try {
      const response = await fetch(`/api/wecom-accounts/${accountId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentId: newDocumentId })
      });

      const data = await response.json();

      if (data.success) {
        setShowAddDocumentModal(false);
        setNewDocumentId('');
        fetchDocuments();
      } else {
        alert(data.error || '添加文档失败');
      }
    } catch (err) {
      alert('网络错误，请检查连接后重试');
      console.error('Error adding document:', err);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('确定要删除这个智能文档吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/wecom-accounts/${accountId}/documents/${documentId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        fetchDocuments();
      } else {
        alert(data.error || '删除文档失败');
      }
    } catch (err) {
      alert('网络错误，请检查连接后重试');
      console.error('Error deleting document:', err);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      case 'syncing':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '活跃';
      case 'inactive':
        return '未激活';
      case 'syncing':
        return '同步中';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          加载失败
        </h3>
        <p className="mb-4 text-center text-gray-600 dark:text-gray-400">
          {error || '账号不存在'}
        </p>
        <button
          onClick={() => router.push('/dashboard/wecom-accounts')}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
            </div>
            <nav className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 dark:bg-blue-900/20">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  账号详情
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {currentUser?.username || 'admin'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  退出
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/wecom-accounts')}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/20">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {account.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Corp ID: {account.corpId}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">总文档数</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{documents.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">活跃文档</span>
              </div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {documents.filter(d => d.status === 'active').length}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">同步中</span>
              </div>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {documents.filter(d => d.status === 'syncing').length}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                智能文档管理
              </h3>
              <button
                onClick={() => setShowAddDocumentModal(true)}
                className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
              >
                <Plus className="h-4 w-4" />
                添加文档
              </button>
            </div>

            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索文档名称或ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">全部状态</option>
                    <option value="active">活跃</option>
                    <option value="inactive">未激活</option>
                    <option value="syncing">同步中</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12">
                <FileText className="mb-4 h-16 w-16 text-gray-400" />
                <h4 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {documents.length === 0 ? '暂无智能文档' : '未找到匹配的文档'}
                </h4>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {documents.length === 0 ? '点击上方按钮添加第一个智能文档' : '尝试调整搜索条件'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/20">
                        <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                          {doc.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ID: {doc.id} · {doc.sheetCount} 个工作表
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {getStatusText(doc.status)}
                      </span>
                      {doc.lastSyncTime && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(doc.lastSyncTime).toLocaleString('zh-CN')}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {showAddDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h3 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
              添加智能文档
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  文档ID
                </label>
                <input
                  type="text"
                  value={newDocumentId}
                  onChange={(e) => setNewDocumentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="输入企业微信文档ID"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  系统将自动根据文档ID从企业微信平台获取文档名称
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddDocumentModal(false);
                    setNewDocumentId('');
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleAddDocument}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}