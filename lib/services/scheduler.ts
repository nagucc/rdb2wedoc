import { syncService } from './sync.service';
import { getJobs, saveJob } from '@/lib/config/storage';
import { Logger } from '@/lib/utils/helpers';

declare global {
  var schedulerManagerInstance: SchedulerManager | undefined;
}

/**
 * 调度器管理器
 * 负责管理所有同步作业的调度生命周期
 */
export class SchedulerManager {
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): SchedulerManager {
    if (typeof global !== 'undefined' && global.schedulerManagerInstance) {
      return global.schedulerManagerInstance;
    }

    const instance = new SchedulerManager();
    
    if (typeof global !== 'undefined') {
      global.schedulerManagerInstance = instance;
    }
    
    return instance;
  }

  /**
   * 初始化调度器
   * 在应用启动时调用，加载并启动所有启用的同步作业
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      Logger.warn('调度器已经初始化');
      return;
    }

    try {
      Logger.info('正在初始化调度器...');

      // 获取所有同步作业
      const jobs = await getJobs();

      // 启动所有启用的作业
      let enabledCount = 0;
      for (const job of jobs) {
        if (job.enabled) {
          try {
            syncService.scheduleJob(job);
            enabledCount++;
          } catch (error) {
            Logger.error(`启动同步作业失败: ${job.name}`, {
              jobId: job.id,
              error: (error as Error).message
            });
          }
        }
      }

      this.isInitialized = true;

      // 保存到全局变量
      if (typeof global !== 'undefined') {
        global.schedulerManagerInstance = this;
      }

      Logger.info(`调度器初始化完成，已启动 ${enabledCount} 个同步作业`, {
        totalJobs: jobs.length,
        enabledJobs: enabledCount
      });
    } catch (error) {
      Logger.error('调度器初始化失败', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 关闭调度器
   * 在应用关闭时调用，停止所有同步作业
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      Logger.info('正在关闭调度器...');

      // 停止所有作业
      syncService.stopAllJobs();

      this.isInitialized = false;

      Logger.info('调度器已关闭');
    } catch (error) {
      Logger.error('调度器关闭失败', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 重新加载调度器
   * 重新加载所有作业配置并重启调度
   */
  async reload(): Promise<void> {
    Logger.info('正在重新加载调度器...');

    // 先关闭
    await this.shutdown();

    // 等待一小段时间确保所有任务停止
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 重新初始化
    await this.initialize();

    Logger.info('调度器重新加载完成');
  }

  /**
   * 添加作业到调度器
   */
  async addJob(jobId: string): Promise<void> {
    try {
      const jobs = await getJobs();
      const job = jobs.find(j => j.id === jobId);

      if (!job) {
        throw new Error(`作业不存在: ${jobId}`);
      }

      if (job.enabled) {
        syncService.scheduleJob(job);
        Logger.info(`已添加作业到调度器: ${job.name}`, { jobId });
      }
    } catch (error) {
      Logger.error('添加作业到调度器失败', { jobId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 从调度器中移除作业
   */
  removeJob(jobId: string): void {
    try {
      syncService.unscheduleJob(jobId);
      Logger.info(`已从调度器中移除作业: ${jobId}`);
    } catch (error) {
      Logger.error('从调度器中移除作业失败', { jobId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 更新作业调度
   */
  async updateJob(jobId: string): Promise<void> {
    try {
      // 先移除旧调度
      this.removeJob(jobId);

      // 重新添加
      await this.addJob(jobId);

      Logger.info(`已更新作业调度: ${jobId}`);
    } catch (error) {
      Logger.error('更新作业调度失败', { jobId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): {
    isInitialized: boolean;
    scheduledJobs: string[];
    runningJobs: string[];
  } {
    return {
      isInitialized: this.isInitialized,
      scheduledJobs: syncService.getScheduledJobs(),
      runningJobs: syncService.getScheduledJobs().filter(jobId => 
        syncService.isJobRunning(jobId)
      )
    };
  }

  /**
   * 检查调度器是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// 导出单例
export const schedulerManager = SchedulerManager.getInstance();

/**
 * 调度器初始化中间件
 * 用于在Next.js应用启动时初始化调度器
 */
export async function initializeScheduler() {
  try {
    await schedulerManager.initialize();
  } catch (error) {
    Logger.error('调度器初始化失败', { error: (error as Error).message });
    // 不抛出错误，避免影响应用启动
  }
}

/**
 * 调度器关闭钩子
 * 用于在应用关闭时优雅关闭调度器
 */
export async function shutdownScheduler() {
  try {
    await schedulerManager.shutdown();
  } catch (error) {
    Logger.error('调度器关闭失败', { error: (error as Error).message });
  }
}
