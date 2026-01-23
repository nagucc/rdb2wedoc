'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  RefreshCw,
  Database,
  Clock,
  TrendingUp,
  AlertTriangle,
  Settings,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  Users,
  FileText
} from 'lucide-react';
import { authService } from '@/lib/services/authService';
import MetricsCard from '@/components/dashboard/MetricsCard';
import ActivityChart from '@/components/dashboard/ActivityChart';
import JobExecutionRecords from '@/components/dashboard/JobExecutionRecords';
import SystemStatus from '@/components/dashboard/SystemStatus';
import DataSourceModule from '@/components/dashboard/datasource/DataSourceModule';
import Header from '@/components/layout/Header';

interface SystemMetrics {
  timestamp: string;
  totalJobs: number;
  activeJobs: number;
  runningJobs: number;
  failedJobs: number;
  successRate: number;
  avgExecutionTime: number;
  totalRecordsProcessed: number;
  totalDataSources: number;
  connectedDataSources: number;
  disconnectedDataSources: number;
  totalWeComAccounts: number;
  totalMappings: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

function DashboardContent() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const user = authService.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    fetchDashboardData();
  }, [router]);

  useEffect(() => {
    const refreshInterval = parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '5000');

    const interval = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.title = '控制台 - RDB2WeDoc';
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard');
      const result = await response.json();

      if (result.success) {
        setMetrics(result.data.systemMetrics);
      } else {
        console.error('获取Dashboard数据失败:', result.error);
      }
    } catch (error) {
      console.error('获取Dashboard数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header showPageTitle={false} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              系统概览
            </h2>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              实时监控系统状态和作业执行情况
            </p>
          </div>
        </div>

        {metrics && (
          <>
            <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
              <MetricsCard
                title="数据源总数"
                value={metrics.totalDataSources}
                icon={Database}
                color="blue"
                trend={metrics.connectedDataSources > 0 ? `${metrics.connectedDataSources}已连接` : '无数据源'}
                description="系统配置的所有数据源"
                href="/databases"
              />
              <MetricsCard
                title="企业微信账号"
                value={metrics.totalWeComAccounts}
                icon={Users}
                color="green"
                trend={metrics.totalWeComAccounts > 0 ? '已配置' : '未配置'}
                description="系统配置的企业微信账号"
                href="/dashboard/wecom-accounts"
              />
              <MetricsCard
                title="数据映射"
                value={metrics.totalMappings}
                icon={FileText}
                color="purple"
                trend={metrics.totalMappings > 0 ? `${metrics.totalMappings}个映射` : '无映射'}
                description="数据源与目标的映射配置"
                href="/mappings"
              />
              <MetricsCard
                title="同步作业"
                value={metrics.totalJobs}
                icon={RefreshCw}
                color="blue"
                trend={metrics.runningJobs > 0 ? `${metrics.runningJobs}运行中` : '无运行'}
                description="所有配置的同步作业"
                href="/sync-jobs"
              />

              
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    活动趋势
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    最近7天
                  </span>
                </div>
                <ActivityChart />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    系统状态
                  </h3>
                  <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    <Settings className="h-4 w-4" />
                    配置
                  </button>
                </div>
                <SystemStatus metrics={metrics} />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      作业运行情况
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      最近20条执行记录
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500"></span>
                        成功
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-500"></span>
                        失败
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                        运行中
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <JobExecutionRecords 
                scrollSpeed={1}
                scrollDirection="down"
              />
            </div>
          </>
        )}

        {!metrics && !loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 dark:border-gray-700 dark:bg-gray-800">
            <AlertTriangle className="mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              暂无数据
            </h3>
            <p className="text-center text-gray-600 dark:text-gray-400">
              请先配置数据源和同步作业
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
    </div>}>
      <DashboardContent />
    </Suspense>
  );
}
