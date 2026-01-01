'use client';

import { useState, useEffect } from 'react';
import { FileText, RefreshCw, AlertCircle, Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import MetricsCard from '../MetricsCard';

interface DataTargetMetrics {
  totalWeComAccounts: number;
  activeWeComAccounts: number;
  totalDocuments: number;
  activeDocuments: number;
  totalSheets: number;
  totalFields: number;
  lastSyncTime: string;
  syncSuccessRate: number;
}

export default function DataTargetModule() {
  const [metrics, setMetrics] = useState<DataTargetMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDataTargets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/datatargets');
      const data = await response.json();

      if (data.success) {
        setMetrics(data.data);
      } else {
        setError(data.error || '获取数据目标失败');
      }
    } catch (err) {
      setError('网络错误，请检查连接后重试');
      console.error('Error fetching data targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataTargets();
    const interval = setInterval(fetchDataTargets, 30000);
    return () => clearInterval(interval);
  }, []);

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
          onClick={fetchDataTargets}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            数据目标统计
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            企业微信和智能表格的配置与使用情况
          </p>
        </div>
        <button
          onClick={fetchDataTargets}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="企业微信账号"
          value={metrics?.totalWeComAccounts || 0}
          icon={Users}
          color="blue"
          trend={`${metrics?.activeWeComAccounts || 0} 活跃`}
          description="已配置的企业微信账号"
          href="/dashboard/wecom-accounts"
        />
        <MetricsCard
          title="智能表格"
          value={metrics?.totalDocuments || 0}
          icon={FileText}
          color="green"
          trend={`${metrics?.activeDocuments || 0} 活跃`}
          description="已配置的智能表格"
          href="/dashboard/documents"
        />
        <MetricsCard
          title="工作表"
          value={metrics?.totalSheets || 0}
          icon={FileText}
          color="purple"
          trend="总计"
          description="所有文档的工作表数量"
        />
        <MetricsCard
          title="字段"
          value={metrics?.totalFields || 0}
          icon={CheckCircle}
          color="orange"
          trend="总计"
          description="所有工作表的字段数量"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              同步状态
            </h4>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              {metrics?.lastSyncTime ? new Date(metrics.lastSyncTime).toLocaleString() : '从未同步'}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                同步成功率
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all"
                    style={{ width: `${metrics?.syncSuccessRate || 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {metrics?.syncSuccessRate?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                活跃企业微信账号
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics?.activeWeComAccounts || 0} / {metrics?.totalWeComAccounts || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                活跃智能表格
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics?.activeDocuments || 0} / {metrics?.totalDocuments || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              使用统计
            </h4>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      企业微信账号
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      已配置 {metrics?.totalWeComAccounts || 0} 个账号
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics?.totalWeComAccounts || 0}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                    <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      智能表格
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      已配置 {metrics?.totalDocuments || 0} 个文档
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics?.totalDocuments || 0}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                    <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      总字段数
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      跨所有工作表
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics?.totalFields || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
