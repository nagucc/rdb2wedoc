'use client';

import { SystemMetrics } from '@/lib/services/monitoring.service';
import { 
  Activity, 
  Database, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Server,
  HardDrive,
  Cpu,
  Wifi,
  Play
} from 'lucide-react';

interface SystemStatusProps {
  metrics: SystemMetrics;
}

export default function SystemStatus({ metrics }: SystemStatusProps) {
  const formatExecutionTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatRecords = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400';
    if (rate >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSuccessRateBg = (rate: number): string => {
    if (rate >= 90) return 'bg-green-100 dark:bg-green-900/20';
    if (rate >= 70) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const statusItems = [
    {
      icon: Activity,
      label: '总作业数',
      value: metrics.totalJobs.toString(),
      color: 'blue',
      trend: 'active'
    },
    {
      icon: Play,
      label: '运行中',
      value: metrics.runningJobs.toString(),
      color: 'green',
      trend: metrics.runningJobs > 0 ? 'running' : 'idle'
    },
    {
      icon: AlertTriangle,
      label: '失败作业',
      value: metrics.failedJobs.toString(),
      color: metrics.failedJobs > 0 ? 'red' : 'green',
      trend: metrics.failedJobs > 0 ? 'warning' : 'normal'
    },
    {
      icon: CheckCircle,
      label: '成功率',
      value: `${metrics.successRate.toFixed(1)}%`,
      color: metrics.successRate >= 90 ? 'green' : metrics.successRate >= 70 ? 'yellow' : 'red',
      trend: metrics.successRate >= 90 ? 'excellent' : metrics.successRate >= 70 ? 'good' : 'poor'
    }
  ];

  const systemResources = [
    {
      icon: Cpu,
      label: 'CPU使用率',
      value: '45%',
      color: 'green'
    },
    {
      icon: HardDrive,
      label: '内存使用',
      value: '62%',
      color: 'yellow'
    },
    {
      icon: Database,
      label: '磁盘使用',
      value: '38%',
      color: 'green'
    },
    {
      icon: Wifi,
      label: '网络延迟',
      value: '12ms',
      color: 'green'
    }
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400'
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/20',
      text: 'text-green-600 dark:text-green-400'
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/20',
      text: 'text-red-600 dark:text-red-400'
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      text: 'text-yellow-600 dark:text-yellow-400'
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {statusItems.map((item, index) => {
          const Icon = item.icon;
          const classes = colorClasses[item.color as keyof typeof colorClasses];

          return (
            <div
              key={index}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${classes.bg} ${classes.text}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {item.label}
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {item.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              系统资源
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            实时监控
          </span>
        </div>

        <div className="space-y-3">
          {systemResources.map((resource, index) => {
            const Icon = resource.icon;
            const classes = colorClasses[resource.color as keyof typeof colorClasses];
            const percentage = parseInt(resource.value);

            return (
              <div key={index}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {resource.label}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${classes.text}`}>
                    {resource.value}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      resource.color === 'green' ? 'bg-green-500' :
                      resource.color === 'yellow' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              总处理记录数
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatRecords(metrics.totalRecordsProcessed)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              平均执行时间
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatExecutionTime(metrics.avgExecutionTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
