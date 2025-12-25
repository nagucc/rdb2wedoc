import { Logger, generateId } from '@/lib/utils/helpers';

export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  category: 'system' | 'database' | 'api' | 'sync' | 'notification' | 'backup' | 'other';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ErrorStats {
  totalErrors: number;
  unresolvedErrors: number;
  errorsByLevel: Record<string, number>;
  errorsByCategory: Record<string, number>;
  recentErrors: ErrorLog[];
}

export interface ErrorFilter {
  level?: 'error' | 'warning' | 'info';
  category?: string;
  resolved?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * 错误处理服务
 * 负责系统错误的收集、记录、分析和处理
 */
export class ErrorHandlerService {
  private static instance: ErrorHandlerService;
  private errorLogs: ErrorLog[] = [];
  private maxErrorLogs = 1000;

  private constructor() {
    this.initializeErrorHandling();
  }

  static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  /**
   * 初始化错误处理
   */
  private initializeErrorHandling(): void {
    // 全局未捕获异常处理
    process.on('uncaughtException', (error: Error) => {
      this.logError(error, {
        level: 'error',
        category: 'system',
        message: '未捕获的异常'
      });
    });

    // 未处理的Promise rejection处理
    process.on('unhandledRejection', (reason: any) => {
      this.logError(reason instanceof Error ? reason : new Error(String(reason)), {
        level: 'error',
        category: 'system',
        message: '未处理的Promise rejection'
      });
    });

    Logger.info('错误处理服务初始化成功');
  }

  /**
   * 记录错误
   */
  logError(
    error: Error,
    options: {
      level?: 'error' | 'warning' | 'info';
      category?: 'system' | 'database' | 'api' | 'sync' | 'notification' | 'backup' | 'other';
      message?: string;
      context?: Record<string, any>;
      userId?: string;
    } = {}
  ): ErrorLog {
    const errorLog: ErrorLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      level: options.level || 'error',
      category: options.category || 'other',
      message: options.message || error.message,
      stack: error.stack,
      context: options.context,
      userId: options.userId,
      resolved: false
    };

    this.errorLogs.unshift(errorLog);

    // 限制错误日志数量
    if (this.errorLogs.length > this.maxErrorLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxErrorLogs);
    }

    // 根据错误级别记录到Logger
    switch (errorLog.level) {
      case 'error':
        Logger.error(errorLog.message, {
          category: errorLog.category,
          stack: errorLog.stack,
          context: errorLog.context
        });
        break;
      case 'warning':
        Logger.warn(errorLog.message, {
          category: errorLog.category,
          context: errorLog.context
        });
        break;
      case 'info':
        Logger.info(errorLog.message, {
          category: errorLog.category,
          context: errorLog.context
        });
        break;
    }

    return errorLog;
  }

  /**
   * 获取错误日志
   */
  getErrorLogs(filter?: ErrorFilter): ErrorLog[] {
    let logs = [...this.errorLogs];

    if (filter) {
      if (filter.level) {
        logs = logs.filter(log => log.level === filter.level);
      }
      if (filter.category) {
        logs = logs.filter(log => log.category === filter.category);
      }
      if (filter.resolved !== undefined) {
        logs = logs.filter(log => log.resolved === filter.resolved);
      }
      if (filter.startDate) {
        logs = logs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter(log => log.timestamp <= filter.endDate!);
      }
      if (filter.limit) {
        logs = logs.slice(0, filter.limit);
      }
    }

    return logs;
  }

  /**
   * 获取错误详情
   */
  getErrorById(errorId: string): ErrorLog | undefined {
    return this.errorLogs.find(log => log.id === errorId);
  }

  /**
   * 标记错误为已解决
   */
  resolveError(
    errorId: string,
    resolvedBy: string,
    note?: string
  ): boolean {
    const errorLog = this.errorLogs.find(log => log.id === errorId);

    if (!errorLog) {
      return false;
    }

    errorLog.resolved = true;
    errorLog.resolvedAt = new Date().toISOString();
    errorLog.resolvedBy = resolvedBy;

    if (note) {
      errorLog.context = {
        ...errorLog.context,
        resolutionNote: note
      };
    }

    Logger.info('错误已标记为解决', { errorId, resolvedBy });

    return true;
  }

  /**
   * 批量解决错误
   */
  resolveErrorsByCategory(
    category: string,
    resolvedBy: string,
    note?: string
  ): number {
    const unresolvedInCategory = this.errorLogs.filter(
      log => log.category === category && !log.resolved
    );

    unresolvedInCategory.forEach(log => {
      log.resolved = true;
      log.resolvedAt = new Date().toISOString();
      log.resolvedBy = resolvedBy;

      if (note) {
        log.context = {
          ...log.context,
          resolutionNote: note
        };
      }
    });

    Logger.info('批量解决错误完成', { 
      category, 
      count: unresolvedInCategory.length,
      resolvedBy 
    });

    return unresolvedInCategory.length;
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): ErrorStats {
    const totalErrors = this.errorLogs.length;
    const unresolvedErrors = this.errorLogs.filter(log => !log.resolved).length;

    const errorsByLevel: Record<string, number> = {};
    const errorsByCategory: Record<string, number> = {};

    this.errorLogs.forEach(log => {
      errorsByLevel[log.level] = (errorsByLevel[log.level] || 0) + 1;
      errorsByCategory[log.category] = (errorsByCategory[log.category] || 0) + 1;
    });

    const recentErrors = this.errorLogs.slice(0, 10);

    return {
      totalErrors,
      unresolvedErrors,
      errorsByLevel,
      errorsByCategory,
      recentErrors
    };
  }

  /**
   * 清除已解决的错误
   */
  clearResolvedErrors(): number {
    const count = this.errorLogs.filter(log => log.resolved).length;
    this.errorLogs = this.errorLogs.filter(log => !log.resolved);

    Logger.info('已清除已解决的错误', { count });

    return count;
  }

  /**
   * 清除所有错误日志
   */
  clearAllErrors(): void {
    const count = this.errorLogs.length;
    this.errorLogs = [];

    Logger.info('已清除所有错误日志', { count });
  }

  /**
   * 获取错误趋势
   */
  getErrorTrend(days: number = 7): Array<{
    date: string;
    errorCount: number;
    warningCount: number;
  }> {
    const trend: Array<{
      date: string;
      errorCount: number;
      warningCount: number;
    }> = [];

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayLogs = this.errorLogs.filter(log => 
        log.timestamp.startsWith(dateStr)
      );

      const errorCount = dayLogs.filter(log => log.level === 'error').length;
      const warningCount = dayLogs.filter(log => log.level === 'warning').length;

      trend.push({
        date: dateStr,
        errorCount,
        warningCount
      });
    }

    return trend;
  }

  /**
   * 导出错误日志
   */
  exportErrorLogs(filter?: ErrorFilter): string {
    const logs = this.getErrorLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * 检查是否有严重错误
   */
  hasCriticalErrors(): boolean {
    return this.errorLogs.some(
      log => log.level === 'error' && !log.resolved
    );
  }

  /**
   * 获取未解决的严重错误
   */
  getUnresolvedCriticalErrors(): ErrorLog[] {
    return this.errorLogs.filter(
      log => log.level === 'error' && !log.resolved
    );
  }
}

// 导出单例
export const errorHandlerService = ErrorHandlerService.getInstance();
