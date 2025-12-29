'use client';

import { Activity, Clock, TrendingUp, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { DataSourceMetrics } from '@/lib/services/datasource.service';

interface DataSourceHealthPanelProps {
  metrics: DataSourceMetrics;
}

export default function DataSourceHealthPanel({ metrics }: DataSourceHealthPanelProps) {
  const getHealthStatus = (score: number) => {
    if (score >= 80) {
      return {
        status: '优秀',
        color: 'green',
        icon: CheckCircle
      };
    } else if (score >= 60) {
      return {
        status: '良好',
        color: 'yellow',
        icon: TrendingUp
      };
    } else {
      return {
        status: '需要关注',
        color: 'red',
        icon: AlertTriangle
      };
    }
  };

  const healthStatus = getHealthStatus(metrics.healthScore);

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400';
    if (rate >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSuccessRateBg = (rate: number) => {
    if (rate >= 90) return 'bg-green-100 dark:bg-green-900/20';
    if (rate >= 70) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const formatLastSync = (dateString: string): string => {
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

  const formatExecutionTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const colorClasses = {
    green: {
      bg: 'bg-green-100 dark:bg-green-900/20',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800'
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800'
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800'
    }
  };

  const classes = colorClasses[healthStatus.color as keyof typeof colorClasses];
  const HealthIcon = healthStatus.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            健康状态监控
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            实时监控数据源连接和同步状态
          </p>
        </div>
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${classes.border} ${classes.bg}`}>
          <HealthIcon className={`h-5 w-5 ${classes.text}`} />
          <div>
            <div className={`text-sm font-semibold ${classes.text}`}>
              {healthStatus.status}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              健康分 {metrics.healthScore}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mb-3 flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${getSuccessRateBg(metrics.connectionSuccessRate)} ${getSuccessRateColor(metrics.connectionSuccessRate)}`}>
              <CheckCircle className="h-4 w-4" />
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              连接成功率
            </div>
          </div>
          <div className={`text-3xl font-bold ${getSuccessRateColor(metrics.connectionSuccessRate)}`}>
            {metrics.connectionSuccessRate.toFixed(1)}%
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                metrics.connectionSuccessRate >= 90 ? 'bg-green-500' :
                metrics.connectionSuccessRate >= 70 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${metrics.connectionSuccessRate}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              最近同步
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatLastSync(metrics.lastSyncTime)}
          </div>
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {new Date(metrics.lastSyncTime).toLocaleString('zh-CN')}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              同步频率
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {metrics.syncFrequency}
          </div>
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            自动同步任务
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          性能指标
        </h4>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Activity className="h-4 w-4" />
                <span>平均查询时间</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatExecutionTime(metrics.avgQueryTime)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  metrics.avgQueryTime < 1000 ? 'bg-green-500' :
                  metrics.avgQueryTime < 3000 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (metrics.avgQueryTime / 5000) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <TrendingUp className="h-4 w-4" />
                <span>总查询次数</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.totalQueries.toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (metrics.totalQueries / 10000) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="h-4 w-4" />
                <span>数据传输量</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {(metrics.totalDataTransferred / 1000).toFixed(1)}K
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (metrics.totalDataTransferred / 100000) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {metrics.connectionStatus === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h5 className="text-sm font-semibold text-red-900 dark:text-red-400">
                连接异常告警
              </h5>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                数据源连接失败，请检查网络连接和配置信息。建议立即排查问题以避免数据同步中断。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}