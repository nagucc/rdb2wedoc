'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Building2, Save, AlertCircle, CheckCircle, Loader2, Eye, EyeOff, Info } from 'lucide-react';
import Header from '@/components/layout/Header';

interface WeComAccount {
  id: string;
  name: string;
  corpId: string;
  corpSecret: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EditWeComAccountPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<WeComAccount>({
    id: '',
    name: '',
    corpId: '',
    corpSecret: '',
    enabled: true,
    createdAt: '',
    updatedAt: ''
  });
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAccountDetails();
  }, [accountId]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = '编辑企业微信账户 - RDB2WeDoc';
    }
  }, []);

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wecom-accounts/${accountId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const acc = result.data;
        setAccount({
          id: acc.id,
          name: acc.name,
          corpId: acc.corpId,
          corpSecret: '',
          enabled: acc.enabled,
          createdAt: acc.createdAt,
          updatedAt: acc.updatedAt
        });
      } else {
        router.push('/dashboard/wecom-accounts');
      }
    } catch (error) {
      console.error('Failed to fetch account details:', error);
      router.push('/dashboard/wecom-accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof WeComAccount, value: string | boolean) => {
    setAccount(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!account.name.trim()) {
      newErrors.name = '请输入账号名称';
    } else if (account.name.length < 2) {
      newErrors.name = '账号名称至少需要2个字符';
    } else if (account.name.length > 100) {
      newErrors.name = '账号名称不能超过100个字符';
    }

    if (!account.corpId.trim()) {
      newErrors.corpId = '请输入企业ID';
    } else if (!/^[a-zA-Z0-9\-]+$/.test(account.corpId)) {
      newErrors.corpId = '企业ID只能包含字母、数字和连字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setNotification(null);

    try {
      const response = await fetch(`/api/wecom-accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: account.name,
          corpId: account.corpId,
          corpSecret: account.corpSecret || undefined,
          enabled: account.enabled
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setNotification({
          type: 'success',
          message: '账号更新成功！正在跳转...'
        });

        setTimeout(() => {
          router.push('/dashboard/wecom-accounts');
        }, 1500);
      } else {
        const errorMessage = result.error || '保存失败，请重试';
        setNotification({
          type: 'error',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('更新账号失败:', error);
      setNotification({
        type: 'error',
        message: '网络错误，请检查连接后重试'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载账号配置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header 
        showPageTitle={false} 
        breadcrumbItems={[
          { title: '控制台', href: '/dashboard' },
          { title: '企业微信账户管理', href: '/dashboard/wecom-accounts' },
          { title: '编辑企业微信账户', href: `/dashboard/wecom-accounts/edit/${accountId}`, isActive: true }
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
                  请填写企业微信账号信息。如果不修改Secret，请留空Secret字段。
                  企业ID和Secret可以在企业微信管理后台的"应用管理"中获取。
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
                  账号名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={account.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="例如：生产环境企业微信"
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
                  企业ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={account.corpId}
                  onChange={(e) => handleInputChange('corpId', e.target.value)}
                  placeholder="wwxxxxxxxxxxxxxxxx"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                    errors.corpId ? 'border-red-500' : ''
                  }`}
                />
                {errors.corpId && (
                  <p className="mt-1 text-sm text-red-600">{errors.corpId}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  企业微信的唯一标识符，可在企业微信管理后台获取
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  应用Secret
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={account.corpSecret}
                    onChange={(e) => handleInputChange('corpSecret', e.target.value)}
                    placeholder="请输入应用Secret"
                    className={`w-full rounded-lg border px-4 py-2.5 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                      errors.corpSecret ? 'border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showSecret ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.corpSecret && (
                  <p className="mt-1 text-sm text-red-600">{errors.corpSecret}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  如果不修改Secret，请留空此字段
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={account.enabled}
                  onChange={(e) => handleInputChange('enabled', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <label htmlFor="enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  启用此账号
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 p-6 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    保存配置
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    确认信息无误后，点击保存按钮更新账号配置
                  </p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      保存
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {notification && (
            <div className={`mt-6 rounded-lg p-4 ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
