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
  Filter,
  Search,
  Download,
  Settings,
  Bell,
  ChevronDown,
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
import JobList from '@/components/dashboard/JobList';
import SystemStatus from '@/components/dashboard/SystemStatus';
import FilterPanel from '@/components/dashboard/FilterPanel';
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

interface JobMetrics {
  jobId: string;
  jobName: string;
  lastExecutionTime: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgExecutionTime: number;
  lastStatus: 'success' | 'failed' | 'running';
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
  const [jobMetrics, setJobMetrics] = useState<JobMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'running'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard');
      const result = await response.json();

      if (result.success) {
        setMetrics(result.data.systemMetrics);
        setJobMetrics(result.data.jobMetrics);
      } else {
        console.error('获取Dashboard数据失败:', result.error);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('获取Dashboard数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handleExport = () => {
    if (!metrics) return;

    const data = {
      timestamp: new Date().toISOString(),
      systemMetrics: metrics,
      jobMetrics: jobMetrics
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredJobs = jobMetrics.filter(job => {
    const matchesSearch = job.jobName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.lastStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!mounted || !currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header showPageTitle={true} pageTitle="控制台" />

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

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>最后更新: {lastUpdated.toLocaleTimeString()}</span>
            </div>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {autoRefresh ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
              {autoRefresh ? '自动刷新' : '已暂停'}
            </button>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4" />
              导出
            </button>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索作业..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              showFilterPanel
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            筛选
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilterPanel && (
          <FilterPanel
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onClose={() => setShowFilterPanel(false)}
          />
        )}

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
              <MetricsCard
                title="运行中"
                value={metrics.runningJobs}
                icon={PlayCircle}
                color="green"
                trend={metrics.runningJobs > 0 ? '运行中' : '无运行'}
                description="当前正在执行的作业"
              />
              <MetricsCard
                title="失败作业"
                value={metrics.failedJobs}
                icon={XCircle}
                color="red"
                trend={metrics.failedJobs > 0 ? '需要关注' : '正常'}
                description="执行失败的作业数量"
              />
              <MetricsCard
                title="成功率"
                value={`${metrics.successRate.toFixed(1)}%`}
                icon={TrendingUp}
                color="purple"
                trend={metrics.successRate >= 90 ? '优秀' : metrics.successRate >= 70 ? '良好' : '需改进'}
                description="作业执行成功率"
              />
              <MetricsCard
                title="活跃作业"
                value={metrics.activeJobs}
                icon={PlayCircle}
                color="green"
                trend={metrics.activeJobs > 0 ? '活跃' : '空闲'}
                description="最近执行的作业数量"
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
                      作业列表
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      共 {filteredJobs.length} 个作业
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
              <JobList jobs={filteredJobs} />
            </div>
          </>
        )}

        {!metrics && !loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 dark:border-gray-700 dark:bg-gray-800">
            <AlertTriangle className="mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              暂无数据
            </h3>
            <p className="mb-4 text-center text-gray-600 dark:text-gray-400">
              请先配置数据源和同步作业
            </p>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              刷新数据
            </button>
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
