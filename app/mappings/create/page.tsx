'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, User, LogOut } from 'lucide-react';
import { authService } from '@/lib/services/authService';

interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'json';
  transformRule?: string;
  defaultValue?: string;
  required: boolean;
  description?: string;
}

interface MappingFormData {
  name: string;
  sourceType: 'database' | 'api' | 'file';
  sourceName: string;
  targetType: 'wecom_doc' | 'database' | 'api';
  targetName: string;
  status: 'active' | 'inactive' | 'draft';
  fieldMappings: FieldMapping[];
}

export default function CreateMappingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<MappingFormData>({
    name: '',
    sourceType: 'database',
    sourceName: '',
    targetType: 'wecom_doc',
    targetName: '',
    status: 'draft',
    fieldMappings: []
  });

  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  useEffect(() => {
    setMounted(true);
    const user = authService.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addFieldMapping = () => {
    const newMapping: FieldMapping = {
      id: `field_${Date.now()}`,
      sourceField: '',
      targetField: '',
      dataType: 'string',
      transformRule: '',
      defaultValue: '',
      required: false,
      description: ''
    };
    setFieldMappings(prev => [...prev, newMapping]);
  };

  const updateFieldMapping = (index: number, field: keyof FieldMapping, value: any) => {
    setFieldMappings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeFieldMapping = (index: number) => {
    setFieldMappings(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('映射名称不能为空');
      return false;
    }

    if (!formData.sourceName.trim()) {
      setError('源名称不能为空');
      return false;
    }

    if (!formData.targetName.trim()) {
      setError('目标名称不能为空');
      return false;
    }

    if (fieldMappings.length === 0) {
      setError('至少需要添加一个字段映射');
      return false;
    }

    for (let i = 0; i < fieldMappings.length; i++) {
      const mapping = fieldMappings[i];
      if (!mapping.sourceField.trim()) {
        setError(`第 ${i + 1} 个字段映射的源字段不能为空`);
        return false;
      }
      if (!mapping.targetField.trim()) {
        setError(`第 ${i + 1} 个字段映射的目标字段不能为空`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          fieldMappings: fieldMappings
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建映射配置失败');
      }

      const result = await response.json();
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建映射配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!mounted || !currentUser) {
    return null;
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
                  创建数据映射
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700">
                  <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {currentUser.username}
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
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow rounded-lg dark:bg-gray-800 dark:border dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创建数据映射</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">配置数据源到数据目标的映射关系</p>
            </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">映射配置创建成功！正在跳转...</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  映射名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                  placeholder="请输入映射名称"
                  required
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  状态
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                >
                  <option value="draft">草稿</option>
                  <option value="active">激活</option>
                  <option value="inactive">未激活</option>
                </select>
              </div>

              <div>
                <label htmlFor="sourceType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  源类型
                </label>
                <select
                  id="sourceType"
                  name="sourceType"
                  value={formData.sourceType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                >
                  <option value="database">数据库</option>
                  <option value="api">API</option>
                  <option value="file">文件</option>
                </select>
              </div>

              <div>
                <label htmlFor="sourceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  源名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="sourceName"
                  name="sourceName"
                  value={formData.sourceName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                  placeholder="请输入源名称"
                  required
                />
              </div>

              <div>
                <label htmlFor="targetType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  目标类型
                </label>
                <select
                  id="targetType"
                  name="targetType"
                  value={formData.targetType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                >
                  <option value="wecom_doc">企业微信文档</option>
                  <option value="database">数据库</option>
                  <option value="api">API</option>
                </select>
              </div>

              <div>
                <label htmlFor="targetName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  目标名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="targetName"
                  name="targetName"
                  value={formData.targetName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                  placeholder="请输入目标名称"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">字段映射</h3>
                <button
                  type="button"
                  onClick={addFieldMapping}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  添加字段映射
                </button>
              </div>

              {fieldMappings.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 dark:bg-gray-700 dark:border-gray-600">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">暂无字段映射，点击上方按钮添加</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fieldMappings.map((mapping, index) => (
                    <div key={mapping.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">字段映射 #{index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeFieldMapping(index)}
                          className="text-red-600 hover:text-red-800 text-sm dark:text-red-400 dark:hover:text-red-300"
                        >
                          删除
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            源字段 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={mapping.sourceField}
                            onChange={(e) => updateFieldMapping(index, 'sourceField', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                            placeholder="例如: user_name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            目标字段 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={mapping.targetField}
                            onChange={(e) => updateFieldMapping(index, 'targetField', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                            placeholder="例如: 姓名"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            数据类型
                          </label>
                          <select
                            value={mapping.dataType}
                            onChange={(e) => updateFieldMapping(index, 'dataType', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                          >
                            <option value="string">字符串</option>
                            <option value="number">数字</option>
                            <option value="date">日期</option>
                            <option value="boolean">布尔值</option>
                            <option value="json">JSON</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            默认值
                          </label>
                          <input
                            type="text"
                            value={mapping.defaultValue}
                            onChange={(e) => updateFieldMapping(index, 'defaultValue', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                            placeholder="例如: N/A"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            转换规则
                          </label>
                          <input
                            type="text"
                            value={mapping.transformRule}
                            onChange={(e) => updateFieldMapping(index, 'transformRule', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                            placeholder="例如: toUpperCase()"
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`required-${index}`}
                            checked={mapping.required}
                            onChange={(e) => updateFieldMapping(index, 'required', e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600"
                          />
                          <label htmlFor={`required-${index}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                            必填字段
                          </label>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            描述
                          </label>
                          <textarea
                            value={mapping.description}
                            onChange={(e) => updateFieldMapping(index, 'description', e.target.value)}
                            rows={2}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                            placeholder="字段映射说明"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '保存中...' : '保存映射'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </main>
    </div>
  );
}