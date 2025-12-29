'use client';

import { Database, Clock, CheckCircle, XCircle, AlertCircle, Server, Calendar, Edit, Trash2 } from 'lucide-react';
import { DataSourceMetrics } from '@/lib/services/datasource.service';

interface DataSourceInfoCardProps {
  metrics: DataSourceMetrics;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function DataSourceInfoCard({ metrics, onClick, onEdit, onDelete }: DataSourceInfoCardProps) {
  const getStatusIcon = () => {
    switch (metrics.connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-gray-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (metrics.connectionStatus) {
      case 'connected':
        return '已连接';
      case 'disconnected':
        return '未连接';
      case 'error':
        return '连接错误';
    }
  };

  const getStatusColor = () => {
    switch (metrics.connectionStatus) {
      case 'connected':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'disconnected':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
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
    return formatDate(dateString);
  };

  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 cursor-pointer"
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 group-hover:scale-150 group-hover:opacity-20 transition-all duration-300 bg-blue-500"></div>
      
      <div className="relative">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 transition-transform group-hover:scale-110">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.dataSourceName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor()}`}>
                  {getStatusIcon()}
                  {getStatusText()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${getHealthBg(metrics.healthScore)}`}>
              <span className={`text-sm font-bold ${getHealthColor(metrics.healthScore)}`}>
                {metrics.healthScore}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">健康分</span>
            </div>
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                title="编辑"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                title="删除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Server className="h-3.5 w-3.5" />
              <span>数据源ID</span>
            </div>
            <div className="text-sm font-mono text-gray-900 dark:text-white truncate">
              {metrics.dataSourceId}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              <span>最近同步</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {formatLastSync(metrics.lastSyncTime)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>连接成功率</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {metrics.connectionSuccessRate.toFixed(1)}%
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>创建时间</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(metrics.createdAt)}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="text-xs">同步频率:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {metrics.syncFrequency}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="text-xs">总查询:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {metrics.totalQueries.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {metrics.connectionStatus === 'error' && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 dark:bg-red-900/10 dark:border-red-800">
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>数据源连接异常，请检查配置</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}