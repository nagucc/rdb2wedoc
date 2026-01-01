'use client';

import { useState, useEffect } from 'react';
import { 
  Clock,
  Info,
  Calendar,
  Edit3
} from 'lucide-react';
import { ScheduleTemplate } from '@/types';

interface ScheduleConfigProps {
  schedule: string;
  scheduleTemplate?: string;
  onScheduleChange: (schedule: string, templateName?: string) => void;
  disabled?: boolean;
  error?: string;
}

export default function ScheduleConfig({
  schedule,
  scheduleTemplate,
  onScheduleChange,
  disabled = false,
  error
}: ScheduleConfigProps) {
  if (typeof onScheduleChange !== 'function') {
    console.error('ScheduleConfig: onScheduleChange prop is not a function');
  }

  const [customExpression, setCustomExpression] = useState(schedule || '');
  const [nextRunTime, setNextRunTime] = useState<string>('');
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setCustomExpression(schedule || '');
    calculateNextRun(schedule || '');
  }, [schedule]);

  const calculateNextRun = (cronExpression: string) => {
    try {
      const parts = cronExpression.split(' ');
      if (parts.length !== 5) {
        setIsValid(false);
        setNextRunTime('');
        return;
      }

      setIsValid(true);
      
      const now = new Date();
      const [minute, hour, day, month, weekday] = parts;
      
      let nextRun = new Date(now);
      
      if (minute === '*') {
        nextRun.setMinutes(now.getMinutes() + 1);
      } else if (minute.startsWith('*/')) {
        const interval = parseInt(minute.slice(2));
        const currentMinute = now.getMinutes();
        const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;
        nextRun.setMinutes(nextMinute);
      } else {
        const targetMinute = parseInt(minute);
        nextRun.setMinutes(targetMinute);
        if (targetMinute <= now.getMinutes()) {
          nextRun.setHours(now.getHours() + 1);
        }
      }
      
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);
      
      const timeDiff = nextRun.getTime() - now.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      let timeString = '';
      if (hours > 0) {
        timeString += `${hours}小时`;
      }
      if (minutes > 0) {
        timeString += `${minutes}分钟`;
      }
      if (timeString === '') {
        timeString = '即将执行';
      }
      
      setNextRunTime(timeString);
    } catch (error) {
      setIsValid(false);
      setNextRunTime('');
    }
  };

  const handleCustomExpressionChange = (expression: string) => {
    setCustomExpression(expression);
    onScheduleChange(expression);
    calculateNextRun(expression);
  };

  const validateCronExpression = (expression: string): boolean => {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return false;
    
    const [minute, hour, day, month, weekday] = parts;
    
    const isValidPart = (part: string, min: number, max: number): boolean => {
      if (part === '*') return true;
      if (part.startsWith('*/')) {
        const interval = parseInt(part.slice(2));
        return !isNaN(interval) && interval > 0 && interval <= max;
      }
      if (part.includes(',')) {
        return part.split(',').every(p => {
          const num = parseInt(p);
          return !isNaN(num) && num >= min && num <= max;
        });
      }
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(p => parseInt(p));
        return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
      }
      const num = parseInt(part);
      return !isNaN(num) && num >= min && num <= max;
    };
    
    return isValidPart(minute, 0, 59) &&
           isValidPart(hour, 0, 23) &&
           isValidPart(day, 1, 31) &&
           isValidPart(month, 1, 12) &&
           isValidPart(weekday, 0, 6);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          同步周期配置
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={customExpression}
            onChange={(e) => handleCustomExpressionChange(e.target.value)}
            placeholder="请输入crond表达式，例如: 0 8 * * *"
            disabled={disabled}
            className={`w-full rounded-lg border px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 ${
              error || !isValid
                ? 'border-red-500 bg-red-50 focus:ring-red-500/20 dark:border-red-500 dark:bg-red-900/20 dark:focus:ring-red-500/20'
                : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-blue-500 dark:focus:ring-blue-500/20'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          />
          <Edit3 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="flex-1 text-sm text-blue-900 dark:text-blue-300">
          <p className="font-medium">您可以自由输入任意的crond表达式</p>
          <p className="mt-2">
            <strong>格式说明:</strong> 分 时 日 月 周
          </p>
          <ul className="mt-2 space-y-1">
            <li>• <code className="mx-1 rounded bg-blue-100 px-1 py-0.5 dark:bg-blue-900/40">* * * * *</code> - 每分钟执行</li>
            <li>• <code className="mx-1 rounded bg-blue-100 px-1 py-0.5 dark:bg-blue-900/40">0 8 * * *</code> - 每天早上8点执行</li>
            <li>• <code className="mx-1 rounded bg-blue-100 px-1 py-0.5 dark:bg-blue-900/40">*/5 * * * *</code> - 每5分钟执行一次</li>
            <li>• <code className="mx-1 rounded bg-blue-100 px-1 py-0.5 dark:bg-blue-900/40">0 0 * * 1</code> - 每周一午夜执行</li>
            <li>• <code className="mx-1 rounded bg-blue-100 px-1 py-0.5 dark:bg-blue-900/40">0 0 1 * *</code> - 每月1号午夜执行</li>
          </ul>
          <p className="mt-2 text-xs text-blue-700 dark:text-blue-400">
            支持所有标准的crond表达式语法，包括通配符、范围、列表等
          </p>
        </div>
      </div>

      {isValid && nextRunTime && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-900/20">
          <Calendar className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-300">
              下次执行时间
            </p>
            <p className="text-xs text-green-700 dark:text-green-400">
              {nextRunTime}后执行
            </p>
          </div>
        </div>
      )}

      {!isValid && customExpression && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-900/20">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-300">
              无效的crond表达式
            </p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-400">
              请检查表达式格式是否正确（分 时 日 月 周），各字段之间用空格分隔
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
