'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, AlertCircle, FileText, Database, Settings, ChevronRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authService } from '@/lib/services/authService';
import Header from '@/components/layout/Header';
import { WecomSmartSheet, DocumentSheet, DocumentField } from '@/types';

interface WeComAccount {
  id: string;
  name: string;
  corpId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function WecomSmartSheetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;
  const documentId = params.documentId as string;

  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [account, setAccount] = useState<WeComAccount | null>(null);
  const [document, setDocument] = useState<WecomSmartSheet | null>(null);
  const [sheets, setSheets] = useState<DocumentSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<DocumentSheet | null>(null);
  const [showSheetFields, setShowSheetFields] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    fetchDocumentDetails();
  }, [accountId, documentId]);

  const fetchDocumentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const [accountResponse, sheetsResponse] = await Promise.all([
        fetch(`/api/wecom-accounts/${accountId}`),
        fetch(`/api/documents/${documentId}/sheets`)
      ]);

      const accountData = await accountResponse.json();
      const sheetsData = await sheetsResponse.json();

      if (accountData.success) {
        setAccount(accountData.data);
      } else {
        throw new Error(accountData.error || '获取账号信息失败');
      }

      if (sheetsData.success) {
        setSheets(sheetsData.data || []);
        
        const docResponse = await fetch(`/api/wecom-accounts/${accountId}/documents`);
        const docData = await docResponse.json();
        
        if (docData.success) {
          const doc = docData.data?.find((d: WecomSmartSheet) => d.id === documentId);
          setDocument(doc || null);
        }
      } else {
        throw new Error(sheetsData.error || '获取工作表列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误，请检查连接后重试');
      console.error('Error fetching document details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchDocumentDetails();
    } catch (err) {
      console.error('Error refreshing document:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSheetClick = async (sheet: DocumentSheet) => {
    setSelectedSheet(sheet);
    setShowSheetFields(true);
    
    try {
      const response = await fetch(`/api/documents/${documentId}/sheets/${sheet.id}/fields`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedSheet({
          ...sheet,
          fields: data.data || []
        });
      }
    } catch (err) {
      console.error('Error fetching sheet fields:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">加载失败</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={`/dashboard/wecom-accounts/${accountId}`}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回账号详情
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {document?.name || '智能表格详情'}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                所属账号: {account?.name}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-blue-800 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? '刷新中...' : '刷新'}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    工作表列表
                  </h2>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {sheets.length} 个工作表
                  </span>
                </div>
              </div>

              {sheets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <FileText className="mb-4 h-16 w-16 text-gray-400" />
                  <h4 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                    暂无工作表
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    点击刷新按钮获取最新的工作表信息
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sheets.map((sheet) => (
                    <div
                      key={sheet.id}
                      onClick={() => handleSheetClick(sheet)}
                      className="flex cursor-pointer items-center justify-between p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {sheet.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ID: {sheet.id}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {showSheetFields && selectedSheet && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedSheet.name} - 字段列表
                      </h2>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        共 {selectedSheet.fields?.length || 0} 个字段
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSheetFields(false)}
                      className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                      关闭
                    </button>
                  </div>
                </div>

                {(!selectedSheet.fields || selectedSheet.fields.length === 0) ? (
                  <div className="flex flex-col items-center justify-center p-12">
                    <Database className="mb-4 h-16 w-16 text-gray-400" />
                    <h4 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                      暂无字段信息
                    </h4>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            字段名称
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            字段ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            类型
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            描述
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedSheet.fields.map((field) => (
                          <tr key={field.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {field.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {field.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                {field.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {field.description || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  基本信息
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">智能表格ID</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{documentId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">智能表格名称</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{document?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">工作表数量</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{document?.sheetCount || 0}</p>
                </div>
                {document?.lastSyncTime && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">最后同步时间</p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {new Date(document.lastSyncTime).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
                {document?.createdAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">创建时间</p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {new Date(document.createdAt).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  快捷操作
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <Link
                  href={`/mappings/create?documentId=${documentId}`}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4" />
                    创建映射配置
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
