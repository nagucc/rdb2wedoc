'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, Edit, Trash2, Database, FileText, Settings, ArrowRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { authService } from '@/lib/services/authService';
import Header from '@/components/layout/Header';
import { MappingConfigUI, FieldMappingUI } from '@/types';

interface DatabaseConnection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  database: string;
}

interface WeComAccount {
  id: string;
  name: string;
  corpId: string;
}

interface WecomSmartSheet {
  id: string;
  name: string;
  accountId: string;
}

interface Sheet {
  sheet_id: string;
  title: string;
}

interface DatabaseField {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

interface DocumentField {
  id: string;
  name: string;
  type: string;
}

export default function MappingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const mappingId = params.id as string;
  
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<MappingConfigUI | null>(null);
  const [database, setDatabase] = useState<DatabaseConnection | null>(null);
  const [document, setDocument] = useState<WecomSmartSheet | null>(null);
  const [wecomAccount, setWeComAccount] = useState<WeComAccount | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [databaseFields, setDatabaseFields] = useState<DatabaseField[]>([]);
  const [documentFields, setDocumentFields] = useState<DocumentField[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = authService.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    const fetchMapping = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/mappings?id=${mappingId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setMapping(result.data);
          
          const mappingData = result.data as MappingConfigUI;
          
          const [dbRes, docRes, accountRes, sheetRes, dbFieldsRes, docFieldsRes] = await Promise.all([
            fetch(`/api/databases/${mappingData.sourceDatabaseId}`),
            fetch(`/api/documents/${mappingData.targetDocId}`),
            fetch(`/api/wecom-accounts`),
            fetch(`/api/documents/${mappingData.targetDocId}/sheets`),
            fetch(`/api/field-mapping/database-fields?databaseId=${mappingData.sourceDatabaseId}&tableName=${mappingData.sourceTableName}`),
            fetch(`/api/field-mapping/document-fields?documentId=${mappingData.targetDocId}&sheetId=${mappingData.targetSheetId}`)
          ]);

          const dbResult = await dbRes.json();
          if (dbResult.success) setDatabase(dbResult.data);

          const docResult = await docRes.json();
          if (docResult.success) setDocument(docResult.data);

          const accountResult = await accountRes.json();
          if (accountResult.success) {
            const account = accountResult.data.find((acc: WeComAccount) => acc.id === docResult.data?.accountId);
            if (account) setWeComAccount(account);
          }

          const sheetResult = await sheetRes.json();
          if (sheetResult.success) {
            const foundSheet = sheetResult.data.find((s: Sheet) => s.sheet_id === mappingData.targetSheetId);
            if (foundSheet) setSheet(foundSheet);
          }

          const dbFieldsResult = await dbFieldsRes.json();
          if (dbFieldsResult.success) setDatabaseFields(dbFieldsResult.data);

          const docFieldsResult = await docFieldsRes.json();
          if (docFieldsResult.success) setDocumentFields(docFieldsResult.data);
        } else {
          setError('加载映射配置失败');
        }
      } catch (error) {
        console.error('Failed to fetch mapping:', error);
        setError('加载映射配置失败');
      } finally {
        setLoading(false);
      }
    };

    fetchMapping();
  }, [mappingId]);

  const handleDelete = async () => {
    if (!mapping) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/mappings?id=${mapping.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除映射配置失败');
      }

      router.push('/mappings');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除映射配置失败');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!mounted || !currentUser) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !mapping) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Header showPageTitle={false} />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow rounded-lg dark:bg-gray-800 dark:border dark:border-gray-700 p-8">
              <div className="flex items-center gap-4 text-red-600">
                <AlertCircle className="h-12 w-12" />
                <div>
                  <h2 className="text-xl font-semibold">加载失败</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{error || '映射配置不存在'}</p>
                </div>
              </div>
              <Link
                href="/mappings"
                className="mt-6 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ArrowLeft className="h-4 w-4" />
                返回映射列表
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header showPageTitle={false} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white shadow rounded-lg dark:bg-gray-800 dark:border dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link
                    href="/mappings"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    返回
                  </Link>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{mapping.name}</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">数据映射配置详情</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/mappings/edit/${mapping.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    编辑
                  </Link>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">数据源信息</h2>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">数据库</p>
                      {database ? (
                        <Link
                          href={`/databases/${database.id}`}
                          className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {database.name}
                        </Link>
                      ) : (
                        <p className="text-gray-600 dark:text-gray-400">{mapping.sourceDatabaseId}</p>
                      )}
                    </div>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      表: <span className="font-medium text-gray-900 dark:text-white">{mapping.sourceTableName}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">数据目标信息</h2>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">企业微信账户</p>
                      <p className="text-gray-600 dark:text-gray-400">{wecomAccount?.name || '未知'}</p>
                    </div>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      文档: <span className="font-medium text-gray-900 dark:text-white">{document?.name || mapping.targetDocId}</span>
                    </p>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      子表: <span className="font-medium text-gray-900 dark:text-white">{sheet?.title || mapping.targetSheetId}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">字段映射</h2>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-100 dark:bg-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          源字段
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          类型
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          转换
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          目标字段
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          数据类型
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          必填
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          默认值
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {mapping.fieldMappings.map((fieldMapping, index) => {
                        const dbField = databaseFields.find(f => f.name === fieldMapping.databaseColumn);
                        const docField = documentFields.find(f => f.id === fieldMapping.documentFieldId);
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {fieldMapping.databaseColumn}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {dbField?.type || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              {fieldMapping.transform ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                                  {fieldMapping.transform}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {docField?.name || fieldMapping.documentField || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {fieldMapping.dataType}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <span className="text-gray-400">-</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {fieldMapping.defaultValue || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">映射统计</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">映射字段数</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {mapping.fieldMappings.length}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">带转换规则</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {mapping.fieldMappings.filter(f => f.transform).length}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">带默认值</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {mapping.fieldMappings.filter(f => f.defaultValue).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">确认删除</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                确定要删除映射配置 "{mapping.name}" 吗？此操作不可撤销。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? '删除中...' : '删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
