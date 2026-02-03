'use client';

import { useState, useEffect } from 'react';
import { useRouter } 
from 'next/navigation';
import { 
  ArrowLeft, 
  Database, 
  Save, 
  TestTube, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import Header from '@/components/layout/Header';

interface DatabaseConfig {
  name: string;
  type: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle' | 'mongodb';
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  charset?: string;
  mongoOptions?: {
    authSource?: string;
    replicaSet?: string;
    ssl?: boolean;
    directConnection?: boolean;
  };
  options?: {
    ssl?: boolean;
    timezone?: string;
    connectionTimeout?: number;
    maxConnections?: number;
  };
}
const databaseTypes = [
  { value: 'mysql', label: 'MySQL', icon: '🐬', defaultPort: '3306' },
  { value: 'postgresql', label: 'PostgreSQL', icon: '🐘', defaultPort: '5432' },
  { value: 'sqlserver', label: 'SQL Server', icon: '🔷', defaultPort: '1433' },
  { value: 'oracle', label: 'Oracle', icon: '🔴', defaultPort: '1521' },
  { value: 'mongodb', label: 'MongoDB', icon: '🍃', defaultPort: '27017' }
];
export default function AddDatabasePage() {
  const router = useRouter();
  const [config, setConfig] = useState<DatabaseConfig>({
    name: '',
    type: 'mysql',
    host: 'localhost',
    port: '3306',
    username: '',
    password: '',
    database: '',
    options: {
      ssl: false,
      timezone: 'UTC',
      connectionTimeout: 30,
      maxConnections: 10
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = '添加数据源 - RDB2WeDoc';
    }
  }, []);

  const handleTypeChange = (type: DatabaseConfig['type']) => {
    const selectedType = databaseTypes.find(t => t.value === type);
    setConfig(prev => ({
      ...prev,
      type,
      port: selectedType?.defaultPort || '3306',
      mongoOptions: type === 'mongodb' ? { authSource: 'admin' } : undefined
    }));
    setTestResult(null);
  };

  const handleInputChange = (field: keyof DatabaseConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    setTestResult(null);
  };

  const handleOptionChange = (field: string, value: string | number | boolean) => {
    setConfig(prev => ({
      ...prev,
      options: { ...prev.options, [field]: value }
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.name.trim()) {
      newErrors.name = '请输入数据源名称';
    } else if (config.name.length < 2) {
      newErrors.name = '数据源名称至少需要2个字符';
    } else if (config.name.length > 100) {
      newErrors.name = '数据源名称不能超过100个字符';
    }

    if (!config.host.trim()) {
      newErrors.host = '请输入主机地址';
    } else {
      const hostPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$/;
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      const localhostPattern = /^(localhost|127\.0\.0\.1)$/;
      
      if (!hostPattern.test(config.host) && !ipPattern.test(config.host) && !localhostPattern.test(config.host)) {
        newErrors.host = '请输入有效的主机地址或IP';
      }
    }

    if (!config.port.trim()) {
      newErrors.port = '请输入端口号';
    } else {
      const portNum = parseInt(config.port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        newErrors.port = '端口号必须在1-65535之间';
      }
    }

    if (!config.username.trim()) {
      newErrors.username = '请输入用户名';
    } else if (config.username.length > 64) {
      newErrors.username = '用户名不能超过64个字符';
    }

    if (!config.password.trim()) {
      newErrors.password = '请输入密码';
    } else if (config.password.length < 4) {
      newErrors.password = '密码至少需要4个字符';
    }

    if (!config.database.trim()) {
      newErrors.database = '请输入数据库名称';
    } else if (!/^[a-zA-Z0-9_][a-zA-Z0-9_\-]*$/.test(config.database)) {
      newErrors.database = '数据库名称只能包含字母、数字、下划线和连字符';
    }

    if (config.options?.connectionTimeout !== undefined) {
      const timeout = config.options.connectionTimeout;
      if (isNaN(timeout) || timeout < 1 || timeout > 300) {
        newErrors.connectionTimeout = '连接超时必须在1-300秒之间';
      }
    }

    if (config.options?.maxConnections !== undefined) {
      const maxConn = config.options.maxConnections;
      if (isNaN(maxConn) || maxConn < 1 || maxConn > 100) {
        newErrors.maxConnections = '最大连接数必须在1-100之间';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/databases/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const result = await response.json();
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? '连接成功' : '连接失败')
      });
    } catch {
      setTestResult({
        success: false,
        message: '连接测试失败，请检查网络连接'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!testResult || !testResult.success) {
      setTestResult({
        success: false,
        message: '请先测试数据库连接，确保配置正确后再保存'
      });
      return;
    }

    setSaving(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/databases', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTestResult({
          success: true,
          message: '数据源保存成功！正在跳转...'
        });
        
        setTimeout(() => {
          router.push('/databases');
        }, 1500);
      } else {
        const errorMessage = result.error || '保存失败，请重试';
        
        if (response.status === 400) {
          setTestResult({
            success: false,
            message: `配置错误: ${errorMessage}`
          });
        } else if (response.status === 409) {
          setTestResult({
            success: false,
            message: `数据源名称已存在，请使用其他名称`
          });
        } else if (response.status === 500) {
          setTestResult({
            success: false,
            message: `服务器错误: ${errorMessage}`
          });
        } else {
          setTestResult({
            success: false,
            message: errorMessage
          });
        }
      }
    } catch (error) {
      console.error('保存数据源失败:', error);
      setTestResult({
        success: false,
        message: '网络错误，请检查连接后重试'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header 
        showPageTitle={false} 
        breadcrumbItems={[
          { title: '控制台', href: '/dashboard' },
          { title: '数据源管理', href: '/databases' },
          { title: '添加数据源', href: '/databases/add', isActive: true }
        ]} 
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                  配置说明
                </h3>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  请填写数据库连接信息。系统将自动测试连接，确保配置正确后才能保存。
                  支持的数据库类型包括 MySQL、PostgreSQL、SQL Server、Oracle 和 MongoDB。
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 p-6 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                基本信息
              </h2>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  数据源名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="例如：生产环境数据库"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  数据库类型 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  {databaseTypes.map((type) => {
                    const isDisabled = ['sqlserver', 'oracle', 'postgresql'].includes(type.value);
                    return (
                      <button
                        key={type.value}
                        onClick={() => !isDisabled && handleTypeChange(type.value as DatabaseConfig['type'])}
                        disabled={isDisabled}
                        title={isDisabled ? '功能暂未开放' : undefined}
                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                          config.type === type.value
                            ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                        } ${isDisabled ? 'disabled:opacity-50 disabled:cursor-not-allowed' : ''}`}
                      >
                        <span className="text-3xl">{type.icon}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    主机地址 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => handleInputChange('host', e.target.value)}
                    placeholder="localhost 或 IP 地址"
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                      errors.host ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.host && (
                    <p className="mt-1 text-sm text-red-600">{errors.host}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    端口 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.port}
                    onChange={(e) => handleInputChange('port', e.target.value)}
                    placeholder="端口号"
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                      errors.port ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.port && (
                    <p className="mt-1 text-sm text-red-600">{errors.port}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    用户名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="数据库用户名"
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                      errors.username ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    密码 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={config.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="数据库密码"
                      className={`w-full rounded-lg border px-4 py-2.5 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                        errors.password ? 'border-red-500' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
              </div>

              <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    数据库名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.database}
                    onChange={(e) => handleInputChange('database', e.target.value)}
                    placeholder="要连接的数据库名"
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                      errors.database ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.database && (
                    <p className="mt-1 text-sm text-red-600">{errors.database}</p>
                  )}
                </div>
            </div>

            <div className="border-t border-gray-200 p-6 dark:border-gray-700">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                高级选项
              </h2>
              
              {config.type === 'mongodb' ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      认证数据库 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={config.mongoOptions?.authSource || 'admin'}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        mongoOptions: { ...prev.mongoOptions, authSource: e.target.value }
                      }))}
                      placeholder="admin"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500">用于身份验证的数据库，通常为 admin</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      副本集名称（可选）
                    </label>
                    <input
                      type="text"
                      value={config.mongoOptions?.replicaSet || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        mongoOptions: { ...prev.mongoOptions, replicaSet: e.target.value }
                      }))}
                      placeholder="rs0"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500">如果连接到副本集，需要指定副本集名称</p>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.mongoOptions?.ssl || false}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          mongoOptions: { ...prev.mongoOptions, ssl: e.target.checked }
                        }))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">使用SSL连接</span>
                    </label>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.mongoOptions?.directConnection || false}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          mongoOptions: { ...prev.mongoOptions, directConnection: e.target.checked }
                        }))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">直接连接模式</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      SSL 连接
                    </label>
                    <select
                      value={config.options?.ssl ? 'true' : 'false'}
                      disabled
                      title="功能暂未开放"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                    >
                      <option value="false">禁用</option>
                      <option value="true">启用</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      字符集
                    </label>
                    <select
                      value={config.charset || 'latin1'}
                      onChange={(e) => handleInputChange('charset', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="latin1">latin1 (MySQL默认)</option>
                      <option value="utf8">utf8</option>
                      <option value="utf8mb4">utf8mb4 (推荐)</option>
                      <option value="gb2312">gb2312</option>
                      <option value="gbk">gbk</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      时区
                    </label>
                    <select
                      value={config.options?.timezone || 'UTC'}
                      disabled
                      title="功能暂未开放"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                    >
                      <option value="UTC">UTC</option>
                      <option value="Asia/Shanghai">Asia/Shanghai</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      连接超时（秒）
                    </label>
                    <input
                      type="number"
                      value={config.options?.connectionTimeout || 30}
                      disabled
                      title="功能暂未开放"
                      min="1"
                      max="300"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      最大连接数
                    </label>
                    <input
                      type="number"
                      value={config.options?.maxConnections || 10}
                      disabled
                      title="功能暂未开放"
                      min="1"
                      max="100"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {testResult && (
              <div className={`border-t p-4 ${
                testResult.success 
                  ? 'bg-green-50 dark:bg-green-900/20' 
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center gap-3">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <span className={`text-sm font-medium ${
                    testResult.success 
                      ? 'text-green-900 dark:text-green-200' 
                      : 'text-red-900 dark:text-red-200'
                  }`}>
                    {testResult.message}
                  </span>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={handleTestConnection}
                  disabled={testing || saving}
                  className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      测试中...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4" />
                      测试连接
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || testing || (testResult !== null && !testResult.success)}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      保存配置
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
