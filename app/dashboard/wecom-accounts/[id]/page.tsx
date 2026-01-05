'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit, Trash2, RefreshCw, AlertCircle, Building2, Search, Filter, CheckCircle, XCircle, Clock, Link2 } from 'lucide-react';
import { authService } from '@/lib/services/authService';
import Header from '@/components/layout/Header';

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
  accountId: string;
}

interface MappingConfigUI {
  id: string;
  name: string;
  sourceDatabaseId: string;
  sourceTableName: string;
  targetDocId: string;
  targetSheetId: string;
  fieldMappings: any[];
  corpId?: string;
  targetName?: string;
  documentName?: string;
  sheetName?: string;
  createdAt: string;
  updatedAt: string;
}

export default function WeComAccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [account, setAccount] = useState<WeComAccount | null>(null);
  const [documents, setDocuments] = useState<IntelligentDocument[]>([]);
  const [mappings, setMappings] = useState<MappingConfigUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'syncing'>('all');
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [newDocumentId, setNewDocumentId] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<IntelligentDocument | null>(null);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [refreshingDocumentId, setRefreshingDocumentId] = useState<string | null>(null);
  const [showCreateSheetModal, setShowCreateSheetModal] = useState(false);
  const [sheetTitle, setSheetTitle] = useState('');
  const [adminUserIds, setAdminUserIds] = useState('');
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/mappings');
      const data = await response.json();

      if (data.success) {
        setMappings(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching mappings:', err);
    }
  };

  const handleRefreshDocument = async (documentId: string) => {
    try {
      setRefreshingDocumentId(documentId);

      const response = await fetch(`/api/wecom-accounts/${accountId}/documents/${documentId}/name`);
      const data = await response.json();

      if (data.success && data.data) {
        setDocuments(prevDocs => 
          prevDocs.map(doc => 
            doc.id === documentId 
              ? { 
                  ...doc, 
                  name: data.data.name,
                  lastSyncTime: data.data.lastSyncTime
                }
              : doc
          )
        );
      } else {
        throw new Error(data.error || '刷新智能表格失败');
      }
    } catch (err) {
      console.error('Error refreshing document:', err);
      alert('刷新智能表格失败，请重试');
    } finally {
      setRefreshingDocumentId(null);
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
    fetchMappings();
  }, [accountId, router]);

  const handleAddDocument = async () => {
    if (!newDocumentId.trim()) {
      alert('请输入智能表格ID');
      return;
    }

    try {
      setIsProcessingDocument(true);
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
        await fetchDocuments();
      } else {
        alert(data.error || '添加智能表格失败，请检查智能表格ID是否正确');
      }
    } catch (err) {
      alert('网络错误，请检查连接后重试');
      console.error('Error adding document:', err);
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!sheetTitle.trim()) {
      setNotification({ type: 'error', message: '请输入表格标题' });
      return;
    }

    if (!adminUserIds.trim()) {
      setNotification({ type: 'error', message: '请输入管理员ID' });
      return;
    }

    const adminIds = adminUserIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
    if (adminIds.length === 0) {
      setNotification({ type: 'error', message: '管理员ID格式不正确' });
      return;
    }

    try {
      setIsCreatingSheet(true);
      setNotification(null);

      const response = await fetch(`/api/wecom-accounts/${accountId}/create-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          docName: sheetTitle.trim(),
          adminUsers: adminIds,
          docType: 10
        })
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ type: 'success', message: '智能表格创建成功！' });
        setShowCreateSheetModal(false);
        setSheetTitle('');
        setAdminUserIds('');
        
        setTimeout(async () => {
          await fetchDocuments();
          setNotification(null);
        }, 2000);
      } else {
        setNotification({ type: 'error', message: data.error || '创建智能表格失败' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: '网络错误，请检查连接后重试' });
      console.error('Error creating sheet:', err);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleDeleteDocument = async (document: IntelligentDocument) => {
    setDocumentToDelete(document);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(`/api/wecom-accounts/${accountId}/documents/${documentToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteConfirmModal(false);
        setDocumentToDelete(null);
        await fetchDocuments();
      } else {
        alert(data.error || '删除智能表格失败');
      }
    } catch (err) {
      alert('网络错误，请检查连接后重试');
      console.error('Error deleting document:', err);
    }
  };

  const cancelDeleteDocument = () => {
    setShowDeleteConfirmModal(false);
    setDocumentToDelete(null);
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

  const getMappingCountForAccount = (): number => {
    if (!account) return 0;
    return mappings.filter(mapping => mapping.corpId === account.corpId).length;
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
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header showPageTitle={false} />

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
                <div className="flex cursor-pointer items-center gap-1 rounded-lg bg-purple-100 px-3 py-1.5 transition-colors hover:bg-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/30">
                  <Link2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    {getMappingCountForAccount()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">总智能表格数</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{documents.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">活跃智能表格</span>
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
                智能表格管理
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateSheetModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                >
                  <Plus className="h-4 w-4" />
                  新建智能表格
                </button>
                <button
                  onClick={() => setShowAddDocumentModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                >
                  <Plus className="h-4 w-4" />
                  添加智能表格
                </button>
              </div>
            </div>

            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索智能表格名称或ID..."
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
                  {documents.length === 0 ? '暂无智能表格' : '未找到匹配的智能表格'}
                </h4>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {documents.length === 0 ? '点击上方按钮添加第一个智能表格' : '尝试调整搜索条件'}
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
                          {doc.sheetCount} 个工作表
                          {doc.lastSyncTime && (
                            <span className="ml-3">
                              更新于 {new Date(doc.lastSyncTime).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {getStatusText(doc.status)}
                      </span>
                      <button
                        onClick={() => handleRefreshDocument(doc.id)}
                        disabled={refreshingDocumentId === doc.id}
                        className="flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-blue-800 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        title="刷新此智能表格"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshingDocumentId === doc.id ? 'animate-spin' : ''}`} />
                        {refreshingDocumentId === doc.id ? '刷新中...' : '刷新'}
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc)}
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
              添加智能表格
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  智能表格ID
                </label>
                <input
                  type="text"
                  value={newDocumentId}
                  onChange={(e) => setNewDocumentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="输入企业微信智能表格ID"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  系统将自动根据智能表格ID从企业微信平台获取智能表格名称
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

      {showCreateSheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h3 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
              新建智能表格
            </h3>
            
            {notification && (
              <div className={`mb-4 rounded-lg p-3 ${
                notification.type === 'success' 
                  ? 'bg-green-50 border border-green-200 dark:bg-green-900/10 dark:border-green-800' 
                  : 'bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-800'
              }`}>
                <p className={`text-sm ${
                  notification.type === 'success' 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {notification.message}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  表格标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sheetTitle}
                  onChange={(e) => setSheetTitle(e.target.value)}
                  disabled={isCreatingSheet}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="输入智能表格标题"
                  maxLength={255}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  最多255个字符
                </p>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  管理员ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={adminUserIds}
                  onChange={(e) => setAdminUserIds(e.target.value)}
                  disabled={isCreatingSheet}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="输入企业微信用户ID，多个ID用英文逗号分隔"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  例如：USERID1,USERID2,USERID3
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateSheetModal(false);
                    setSheetTitle('');
                    setAdminUserIds('');
                    setNotification(null);
                  }}
                  disabled={isCreatingSheet}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateSheet}
                  disabled={isCreatingSheet}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingSheet ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    '创建'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmModal && documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h3 className="mb-3 text-center text-xl font-semibold text-gray-900 dark:text-white">
              确认删除智能表格
            </h3>
            <p className="mb-2 text-center text-sm text-gray-600 dark:text-gray-400">
              您即将删除以下智能表格：
            </p>
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {documentToDelete.name}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                智能表格ID: {documentToDelete.id}
              </p>
            </div>
            <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 dark:bg-yellow-900/10 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ 警告：此操作不可撤销，删除后智能表格将无法恢复
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={cancelDeleteDocument}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteDocument}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {isProcessingDocument && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-800">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            数据处理中
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            正在获取智能表格信息，请稍候...
          </p>
        </div>
      </div>
    )}
  </>
  );
}