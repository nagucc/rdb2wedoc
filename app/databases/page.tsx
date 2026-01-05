'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, RefreshCw, AlertCircle, Database, CheckCircle, XCircle, Link2 } from 'lucide-react';
import { authService } from '@/lib/services/authService';
import Header from '@/components/layout/Header';
import MappingReferenceList from '@/components/MappingReferenceList';

interface DatabaseConfig {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';
  host: string;
  port: string;
  username: string;
  database: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MappingConfig {
  id: string;
  name: string;
  sourceDatabaseId: string;
  sourceTableName: string;
  targetDocId: string;
  targetSheetId: string;
  fieldMappings: Array<{
    databaseColumn: string;
    documentField: string;
    dataType: string;
    transform?: string;
    defaultValue?: string;
  }>;
  status: 'draft' | 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  corpId?: string;
  targetName?: string;
  documentName?: string;
  sheetName?: string;
}

export default function DatabasesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [databases, setDatabases] = useState<DatabaseConfig[]>([]);
  const [mappings, setMappings] = useState<MappingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDatabase, setEditingDatabase] = useState<DatabaseConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'mysql' as 'mysql' | 'postgresql' | 'sqlserver' | 'oracle',
    host: '',
    port: '3306',
    username: '',
    password: '',
    database: '',
    enabled: true
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ show: boolean; databaseId: string; databaseName: string }>({
    show: false,
    databaseId: '',
    databaseName: ''
  });
  const [mappingReferenceDialog, setMappingReferenceDialog] = useState<{
    show: boolean;
    databaseId: string;
    databaseName: string;
  }>({
    show: false,
    databaseId: '',
    databaseName: ''
  });

  const fetchDatabases = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/databases');
      const data = await response.json();

      if (data.success) {
        setDatabases(data.data);
      } else {
        setError(data.error || '获取数据源列表失败');
      }
    } catch (err) {
      setError('网络错误，请检查连接后重试');
      console.error('Error fetching databases:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/mappings');
      const data = await response.json();

      if (data.success) {
        setMappings(data.data);
      } else {
        console.error('获取映射列表失败:', data.error);
      }
    } catch (err) {
      console.error('Error fetching mappings:', err);
    }
  };

  const getMappingCount = (databaseId: string): number => {
    return mappings.filter(mapping => mapping.sourceDatabaseId === databaseId).length;
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    fetchDatabases();
    fetchMappings();
  }, [router]);

  const handleCreate = () => {
    setEditingDatabase(null);
    setFormData({
      name: '',
      type: 'mysql',
      host: '',
      port: '3306',
      username: '',
      password: '',
      database: '',
      enabled: true
    });
    setTestResult(null);
    setShowModal(true);
  };

  const handleEdit = (database: DatabaseConfig) => {
    setEditingDatabase(database);
    setFormData({
      name: database.name,
      type: database.type,
      host: database.host,
      port: database.port,
      username: database.username,
      password: '',
      database: database.database,
      enabled: database.enabled
    });
    setTestResult(null);
    setShowModal(true);
  };

  const handleDelete = (databaseId: string, databaseName: string) => {
    setDeleteDialog({
      show: true,
      databaseId,
      databaseName
    });
  };

  const confirmDelete = async () => {
    const { databaseId } = deleteDialog;
    setDeleteDialog({ ...deleteDialog, show: false });

    try {
      const response = await fetch(`/api/databases?id=${databaseId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        fetchDatabases();
        fetchMappings();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (err) {
      alert('网络错误，请检查连接后重试');
      console.error('Error deleting database:', err);
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ show: false, databaseId: '', databaseName: '' });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/databases/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? '连接成功' : '连接失败')
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: '连接测试失败，请检查网络连接'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!testResult || !testResult.success) {
      alert('请先测试数据库连接，确保配置正确后再保存');
      return;
    }

    try {
      const url = editingDatabase
        ? '/api/databases'
        : '/api/databases';
      const method = editingDatabase ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          id: editingDatabase?.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        fetchDatabases();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (err) {
      alert('网络错误，请检查连接后重试');
      console.error('Error saving database:', err);
    }
  };

  const getDatabaseIcon = (type: string) => {
    return <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
  };

  const getDatabaseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mysql: 'MySQL',
      postgresql: 'PostgreSQL',
      sqlserver: 'SQL Server',
      oracle: 'Oracle'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 dark:border-gray-700 dark:bg-gray-800">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
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
          onClick={fetchDatabases}
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
      <Header showPageTitle={false} />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  数据源管理
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  管理数据库数据源配置
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/databases/add"
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 active:bg-green-700 transition-colors shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                添加数据源
              </Link>
              <button
                onClick={() => {
                  fetchDatabases();
                  fetchMappings();
                }}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {databases.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Database className="mb-4 h-16 w-16 text-gray-400" />
                <h4 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  暂无数据源
                </h4>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  点击上方按钮添加第一个数据源
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {databases.map((database) => (
                  <div
                    key={database.id}
                    className="flex items-center justify-between p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => router.push(`/databases/${database.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/20">
                        {getDatabaseIcon(database.type)}
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                          {database.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getDatabaseTypeLabel(database.type)} · {database.host}:{database.port} · {database.database}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <div
                        onClick={() => setMappingReferenceDialog({
                          show: true,
                          databaseId: database.id,
                          databaseName: database.name
                        })}
                        className="flex cursor-pointer items-center gap-1 rounded-lg bg-purple-100 px-3 py-1.5 transition-colors hover:bg-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/30"
                      >
                        <Link2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                          {getMappingCount(database.id)}
                        </span>
                      </div>
                      <Link
                        href={`/databases/edit/${database.id}`}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Edit className="h-4 w-4" />
                        编辑
                      </Link>
                      <button
                        onClick={() => handleDelete(database.id, database.name)}
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

          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                <h3 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
                  {editingDatabase ? '编辑数据源' : '添加数据源'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      数据源名称
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="输入数据源名称"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      数据库类型
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any, port: e.target.value === 'postgresql' ? '5432' : e.target.value === 'sqlserver' ? '1433' : e.target.value === 'oracle' ? '1521' : '3306' })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      required
                    >
                      <option value="mysql">MySQL</option>
                      <option value="postgresql">PostgreSQL</option>
                      <option value="sqlserver">SQL Server</option>
                      <option value="oracle">Oracle</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        主机地址
                      </label>
                      <input
                        type="text"
                        value={formData.host}
                        onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        placeholder="localhost"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        端口
                      </label>
                      <input
                        type="text"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        placeholder="3306"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      数据库名称
                    </label>
                    <input
                      type="text"
                      value={formData.database}
                      onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="输入数据库名称"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      用户名
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="输入用户名"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      密码
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder={editingDatabase ? '留空保持不变' : '输入密码'}
                      required={!editingDatabase}
                    />
                  </div>
                  
                  {testResult && (
                    <div className={`rounded-lg p-3 ${testResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <div className="flex items-center gap-2">
                        {testResult.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                        <span className={`text-sm ${testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {testResult.message}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="flex-1 rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-blue-400 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      {testing ? '测试中...' : '测试连接'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      {editingDatabase ? '更新' : '创建'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {deleteDialog.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                <div className="mb-6">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
                    确认删除
                  </h3>
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    是否确定删除该数据源？
                  </p>
                  <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-500">
                    数据源名称：{deleteDialog.databaseName}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    否
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    是
                  </button>
                </div>
              </div>
            </div>
          )}

          <MappingReferenceList
            show={mappingReferenceDialog.show}
            onClose={() => setMappingReferenceDialog({ ...mappingReferenceDialog, show: false })}
            databaseId={mappingReferenceDialog.databaseId}
            databaseName={mappingReferenceDialog.databaseName}
          />
        </div>
      </main>
    </div>
  );
}
