'use client';

import { ExecutionLog } from '@/types';
import { CheckCircle, XCircle, Clock, Play } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface JobExecutionRecord {
  id: string;
  jobId: string;
  jobName: string;
  status: 'success' | 'failed' | 'running';
  startTime: string;
  endTime?: string;
  duration?: number;
}

interface JobExecutionRecordsProps {
  scrollSpeed?: number;
  scrollDirection?: 'up' | 'down';
}

export default function JobExecutionRecords({ 
  scrollSpeed = 1, 
  scrollDirection = 'down' 
}: JobExecutionRecordsProps) {
  const [records, setRecords] = useState<JobExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastRecordRef = useRef<HTMLDivElement | null>(null);

  const fetchRecords = async (isInitialLoad = false) => {
    try {
      if (records.length >= 100) {
        setHasMore(false);
        return;
      }

      setLoading(true);
      const limit = isInitialLoad ? 100 : 20;
      const response = await fetch(`/api/jobs/execution-logs?limit=${limit}&page=${page}`);
      const result = await response.json();

      if (result.success) {
        const formattedRecords = await Promise.all(
          result.data.map(async (log: ExecutionLog) => {
            const jobResponse = await fetch(`/api/jobs/${log.jobId}`);
            const jobResult = await jobResponse.json();
            const jobName = jobResult.success ? jobResult.data.name : `作业 ${log.jobId.slice(0, 8)}`;

            return {
              id: log.id,
              jobId: log.jobId,
              jobName,
              status: log.status,
              startTime: log.startTime,
              endTime: log.endTime,
              duration: log.duration
            };
          })
        );

        if (isInitialLoad) {
          // 初始加载时去重
          const uniqueRecords = Array.from(new Map(formattedRecords.map(record => [record.id, record])).values());
          setRecords(uniqueRecords.slice(0, 100));
        } else {
          // 添加新记录时去重
          const existingIds = new Set(records.map(record => record.id));
          const newUniqueRecords = formattedRecords.filter(record => !existingIds.has(record.id));
          const updatedRecords = [...records, ...newUniqueRecords];
          setRecords(updatedRecords.slice(0, 100));
        }

        setHasMore(formattedRecords.length > 0 && records.length < 100);
      }
    } catch (error) {
      console.error('获取作业执行记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRecords(prevRecords => 
        prevRecords.map(record => {
          if (record.status === 'running' && !record.endTime) {
            const currentDuration = new Date().getTime() - new Date(record.startTime).getTime();
            return { ...record, duration: currentDuration };
          }
          return record;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || records.length <= 5 || isPaused) return;

    let animationFrameId: number;
    let lastTimestamp = 0;
    const scrollAmount = scrollSpeed * 0.5;

    const animateScroll = (timestamp: number) => {
      if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
      }

      const deltaTime = timestamp - lastTimestamp;

      if (deltaTime >= 16) {
        if (scrollDirection === 'down') {
          if (container.scrollTop + container.clientHeight < container.scrollHeight) {
            container.scrollTop += scrollAmount;
          } else {
            // 无限循环滚动：滚动到最后一条后，平滑过渡到第一条
            container.scrollTop = 0;
          }
        } else {
          if (container.scrollTop > 0) {
            container.scrollTop -= scrollAmount;
          } else {
            // 无限循环滚动：滚动到第一条后，平滑过渡到最后一条
            container.scrollTop = container.scrollHeight - container.clientHeight;
          }
        }
        lastTimestamp = timestamp;
      }

      if (!isPaused) {
        animationFrameId = requestAnimationFrame(animateScroll);
      }
    };

    animationFrameId = requestAnimationFrame(animateScroll);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [records, isPaused, scrollSpeed, scrollDirection]);

  // 实现无限加载
  useEffect(() => {
    if (!hasMore || loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
          fetchRecords();
        }
      },
      { threshold: 1.0 }
    );

    if (lastRecordRef.current) {
      observerRef.current.observe(lastRecordRef.current);
    }

    return () => {
      if (observerRef.current && lastRecordRef.current) {
        observerRef.current.unobserve(lastRecordRef.current);
      }
    };
  }, [hasMore, loading, page]);

  const getStatusIcon = (status: 'success' | 'failed' | 'running') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />;
      case 'failed':
        return <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />;
      case 'running':
        return <Play className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />;
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDuration = (duration?: number) => {
    if (!duration && duration !== 0) return '-';
    
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    const milliseconds = duration % 1000;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else if (seconds > 0) {
      return `${seconds}s ${milliseconds}ms`;
    } else {
      return `${milliseconds}ms`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Clock className="mb-2 h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          暂无执行记录
        </p>
      </div>
    );
  }

  const showScrollIndicator = records.length > 5;

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  return (
    <div className="relative">
      <div 
        ref={scrollContainerRef}
        className="overflow-y-auto scroll-smooth"
        style={{ 
          maxHeight: 'calc(5 * 4.5rem)',
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {records.map((record, index) => (
            <div
              key={record.id}
              ref={index === records.length - 1 ? lastRecordRef : null}
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                record.status === 'running' 
                  ? 'bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              style={{ minHeight: '4.5rem' }}
            >
              <div className="flex-shrink-0">
                {getStatusIcon(record.status)}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {record.jobName}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    record.status === 'success' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : record.status === 'failed'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                  }`}>
                    {getStatusText(record.status)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(record.startTime)}
                  </span>
                  <span className={`flex items-center gap-1 ${record.status === 'running' ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''}`}>
                    <Play className="h-3 w-3" />
                    <span className="inline-flex items-center gap-1">
                      <span>运行时:</span>
                      <span>{formatDuration(record.duration)}</span>
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showScrollIndicator && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-2 pointer-events-none">
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <svg className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>向下滚动查看更多</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @supports (scrollbar-width: thin) {
          div[style*="max-height"]::-webkit-scrollbar {
            width: 6px;
          }
          div[style*="max-height"]::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 3px;
          }
          div[style*="max-height"]::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }
          div[style*="max-height"]::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .dark div[style*="max-height"]::-webkit-scrollbar-track {
            background: #1e293b;
          }
          .dark div[style*="max-height"]::-webkit-scrollbar-thumb {
            background: #475569;
          }
          .dark div[style*="max-height"]::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        }
      `}</style>
    </div>
  );
}
