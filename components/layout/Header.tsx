'use client';

import { User, LogOut, RefreshCw, LogIn } from 'lucide-react';
import Link from 'next/link';
import { authService } from '@/lib/services/authService';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { User as UserType } from '@/types';
import Breadcrumb from './Breadcrumb';

interface BreadcrumbItem {
  title: string;
  href?: string;
  isActive?: boolean;
}

interface HeaderProps {
  showPageTitle?: boolean;
  pageTitle?: string;
  breadcrumbItems?: BreadcrumbItem[];
}

export default function Header({ showPageTitle = false, pageTitle = '', breadcrumbItems = [] }: HeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkUserStatus();

    const handleStorageChange = () => {
      checkUserStatus();
    };

    const handleAuthStateChange = () => {
      checkUserStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-state-changed', handleAuthStateChange);
    
    const intervalId = setInterval(() => {
      checkUserStatus();
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-state-changed', handleAuthStateChange);
      clearInterval(intervalId);
    };
  }, []);

  const checkUserStatus = () => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setIsChecking(false);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setCurrentUser(null);
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
              {isChecking ? (
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700">
                  <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-300 animate-spin" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    检查中...
                  </span>
                </div>
              ) : currentUser ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {currentUser.username}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    退出
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <LogIn className="h-4 w-4" />
                  登录
                </Link>
              )}
            </div>
          </nav>
        </div>
        {breadcrumbItems.length > 0 && (
          <div className="mt-4">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        )}
      </div>
    </header>
  );
}
