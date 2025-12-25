'use client';

import { JobMetrics } from '@/lib/services/monitoring.service';
import { CheckCircle, XCircle, Clock, MoreVertical, Play, Pause, Eye } from 'lucide-react';
import { useState } from 'react';

interface JobListProps {
  jobs: JobMetrics[];
}

export default function JobList({ jobs }: JobListProps) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const getStatusIcon = (status: 'success' | 'failed' | 'running') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusBadge = (status: 'success' | 'failed' | 'running') => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'running':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
  };

  const getStatusText = (status: 'success' | 'failed' | 'running') => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'running':
        return '运行中';
    }
  };

  const formatExecutionTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateString: string): string => {
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

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          <Clock className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          暂无作业
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {jobs.length === 0 ? '没有找到匹配的作业' : '请先创建同步作业'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {jobs.map((job) => (
        <div
          key={job.jobId}
          className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {getStatusIcon(job.lastStatus)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                    {job.jobName}
                  </h4>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(job.lastStatus)}`}>
                    {getStatusText(job.lastStatus)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(job.lastExecutionTime)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Play className="h-3.5 w-3.5" />
                    执行 {job.executionCount} 次
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    成功 {job.successCount} 次
                  </span>
                  {job.failureCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <XCircle className="h-3.5 w-3.5" />
                      失败 {job.failureCount} 次
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {job.successRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  成功率
                </div>
              </div>

              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatExecutionTime(job.avgExecutionTime)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  平均耗时
                </div>
              </div>

              <button
                onClick={() => setExpandedJob(expandedJob === job.jobId ? null : job.jobId)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>

              <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {expandedJob === job.jobId && (
            <div className="border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    作业ID
                  </div>
                  <div className="text-sm font-mono text-gray-900 dark:text-white">
                    {job.jobId}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    总执行次数
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {job.executionCount}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    成功率
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${job.successRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {job.successRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    平均执行时间
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatExecutionTime(job.avgExecutionTime)}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                  <Play className="h-4 w-4" />
                  立即执行
                </button>
                <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                  <Eye className="h-4 w-4" />
                  查看日志
                </button>
                <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                  <Pause className="h-4 w-4" />
                  暂停作业
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
