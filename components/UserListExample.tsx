'use client';

import { useState } from 'react';
import { Users, Mail, Phone, Calendar, ArrowRight } from 'lucide-react';
import GenericReferenceDialog from './GenericReferenceDialog';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  avatar?: string;
}

export default function UserListExample() {
  const [showDialog, setShowDialog] = useState(false);

  const mockUsers: User[] = [
    {
      id: '1',
      name: '张三',
      email: 'zhangsan@example.com',
      phone: '13800138000',
      joinDate: '2024-01-15'
    },
    {
      id: '2',
      name: '李四',
      email: 'lisi@example.com',
      phone: '13900139000',
      joinDate: '2024-02-20'
    },
    {
      id: '3',
      name: '王五',
      email: 'wangwu@example.com',
      phone: '13700137000',
      joinDate: '2024-03-10'
    }
  ];

  const renderUserItem = (user: User) => (
    <div className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-purple-700">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
          {user.name.charAt(0)}
        </span>
      </div>

      <div className="flex min-w-0 flex-1">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {user.name}
          </h4>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user.email}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {user.phone}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-xs text-purple-600 dark:text-purple-400">
            查看详情
          </span>
          <ArrowRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
    </div>
  );

  const handleUserClick = (user: User) => {
    console.log('点击用户:', user);
    setShowDialog(false);
  };

  return (
    <div className="p-6">
      <button
        onClick={() => setShowDialog(true)}
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
      >
        打开用户列表
      </button>

      <GenericReferenceDialog<User>
        show={showDialog}
        onClose={() => setShowDialog(false)}
        title="用户列表"
        subtitle={`共 ${mockUsers.length} 位用户`}
        icon={<Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
        items={mockUsers}
        renderItem={renderUserItem}
        onItemClick={handleUserClick}
        emptyState={{
          icon: <Users className="h-16 w-16 text-gray-400" />,
          title: '暂无用户',
          description: '当前还没有添加任何用户'
        }}
        maxHeight="500px"
        maxWidth="2xl"
        closeOnOverlayClick={true}
      />
    </div>
  );
}