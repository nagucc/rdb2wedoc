'use client';

import { User, LogOut, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { authService } from '@/lib/services/authService';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  showPageTitle?: boolean;
  pageTitle?: string;
}

export default function Header({ showPageTitle = false, pageTitle = '' }: HeaderProps) {
  const router = useRouter();
  const currentUser = authService.getCurrentUser();

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 transition-transform hover:scale-105 active:scale-95">
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
          </Link>
          <nav className="flex items-center gap-4">
            {showPageTitle && pageTitle && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 dark:bg-blue-900/20">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  {pageTitle}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700">
                <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {currentUser?.username || 'admin'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
