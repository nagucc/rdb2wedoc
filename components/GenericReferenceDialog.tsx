'use client';

import { ReactNode, MouseEvent } from 'react';
import { X } from 'lucide-react';

export interface ReferenceItem<T = any> {
  id: string;
  data: T;
}

export interface GenericReferenceDialogProps<T = any> {
  show: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  items: T[];
  loading?: boolean;
  renderItem: (item: T, index: number) => ReactNode;
  onItemClick?: (item: T, index: number) => void;
  emptyState?: {
    icon?: ReactNode;
    title: string;
    description: string;
  };
  maxHeight?: string;
  maxWidth?: string;
  className?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  enableVirtualScroll?: boolean;
  pageSize?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function GenericReferenceDialog<T = any>({
  show,
  onClose,
  title,
  subtitle,
  icon,
  items,
  loading = false,
  renderItem,
  onItemClick,
  emptyState,
  maxHeight = '500px',
  maxWidth = '2xl',
  className = '',
  showCloseButton = true,
  closeOnOverlayClick = true,
  enableVirtualScroll = false,
  pageSize,
  onLoadMore,
  hasMore
}: GenericReferenceDialogProps<T>) {
  if (!show) return null;

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };

  const handleContentClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!enableVirtualScroll || !onLoadMore || !hasMore) return;

    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      onLoadMore();
    }
  };

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full'
  }[maxWidth] || maxWidth;

  const defaultEmptyState = {
    icon: icon,
    title: '暂无数据',
    description: '当前没有可显示的内容'
  };

  const displayEmptyState = emptyState || defaultEmptyState;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ${className}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`w-full ${maxWidthClass} rounded-2xl bg-white shadow-2xl dark:bg-gray-800`}
        onClick={handleContentClick}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/20">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="关闭"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        <div
          className="overflow-y-auto p-6"
          style={{ maxHeight }}
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              {displayEmptyState.icon && (
                <div className="mb-4 text-gray-400">
                  {displayEmptyState.icon}
                </div>
              )}
              <h4 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {displayEmptyState.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {displayEmptyState.description}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={(item as any).id || index}
                  onClick={() => onItemClick?.(item, index)}
                  className="cursor-pointer"
                >
                  {renderItem(item, index)}
                </div>
              ))}
              {enableVirtualScroll && hasMore && (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}