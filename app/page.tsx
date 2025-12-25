import Link from 'next/link';
import { Database, FileText, RefreshCw, Settings, BarChart3, Shield } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: Database,
      title: '数据源管理',
      description: '支持MySQL、PostgreSQL、SQL Server、Oracle等多种数据库连接',
      link: '/databases'
    },
    {
      icon: FileText,
      title: '企业微信文档',
      description: '无缝集成企业微信智能文档，实现数据同步和协作',
      link: '/documents'
    },
    {
      icon: RefreshCw,
      title: '同步作业',
      description: '创建和管理数据同步任务，支持定时调度和实时监控',
      link: '/jobs'
    },
    {
      icon: BarChart3,
      title: '监控统计',
      description: '实时监控系统状态，查看同步统计和性能指标',
      link: '/dashboard'
    },
    {
      icon: Shield,
      title: '备份恢复',
      description: '系统数据备份和恢复，确保数据安全和业务连续性',
      link: '/settings'
    },
    {
      icon: Settings,
      title: '系统设置',
      description: '配置系统参数、用户权限和通知方式',
      link: '/settings'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
            </div>
            <nav className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                控制台
              </Link>
              <Link
                href="/settings"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                开始使用
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
            </span>
            系统已就绪，开始配置您的数据同步
          </div>
          <h2 className="mb-6 text-5xl font-bold text-gray-900 dark:text-white sm:text-6xl">
            轻松实现
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {' '}数据库{' '}
            </span>
            到
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {' '}企业微信文档{' '}
            </span>
            的智能同步
          </h2>
          <p className="mb-10 text-xl text-gray-600 dark:text-gray-300">
            支持多种数据库类型，灵活的同步策略，实时监控和告警通知，
            让数据管理变得简单高效
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/databases"
              className="flex h-12 items-center justify-center rounded-lg bg-blue-600 px-8 text-base font-medium text-white transition-all hover:bg-blue-700 hover:shadow-lg"
            >
              添加数据源
            </Link>
            <Link
              href="/jobs"
              className="flex h-12 items-center justify-center rounded-lg border-2 border-gray-300 px-8 text-base font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800"
            >
              创建同步任务
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h3 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
            核心功能
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            全方位的数据同步解决方案，满足您的各种业务需求
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Link
              key={index}
              href={feature.link}
              className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6" />
              </div>
              <h4 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
              <div className="mt-4 flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                了解更多
                <svg
                  className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-white md:grid-cols-4">
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold">4+</div>
            <div className="text-blue-100">支持数据库类型</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold">3</div>
            <div className="text-blue-100">同步冲突策略</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold">实时</div>
            <div className="text-blue-100">监控告警</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold">100%</div>
            <div className="text-blue-100">数据安全</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 dark:border-gray-700 dark:bg-gray-800">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            © 2024 RDB2WeDoc. 数据库到企业微信文档同步系统
          </p>
        </div>
      </footer>
    </div>
  );
}