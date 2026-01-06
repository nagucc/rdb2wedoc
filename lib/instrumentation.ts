export const runtime = 'nodejs';

import { schedulerManager } from './services/scheduler';
import { Logger } from './utils/helpers';

let isInitialized = false;

export async function register() {
  if (isInitialized) {
    Logger.warn('调度器已经初始化，跳过重复初始化');
    return;
  }

  try {
    Logger.info('正在初始化调度器...');

    await schedulerManager.initialize();

    isInitialized = true;

    Logger.info('调度器初始化成功');

    const status = schedulerManager.getStatus();
    Logger.info('调度器状态', {
      isInitialized: status.isInitialized,
      scheduledJobs: status.scheduledJobs.length,
      runningJobs: status.runningJobs.length
    });
  } catch (error) {
    Logger.error('调度器初始化失败', { error: (error as Error).message, stack: (error as Error).stack });
    
    isInitialized = false;
  }
}

export async function onShutdown() {
  if (!isInitialized) {
    return;
  }

  try {
    Logger.info('正在关闭调度器...');
    await schedulerManager.shutdown();
    isInitialized = false;
    Logger.info('调度器已关闭');
  } catch (error) {
    Logger.error('调度器关闭失败', { error: (error as Error).message });
  }
}
