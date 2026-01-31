import { getJobs, getJobLogs, getWeComAccounts, getMappings } from '@/lib/config/storage';
import { syncService } from './sync.service';
import { dataSourceService } from './datasource.service';
import { Logger } from '@/lib/utils/helpers';

export interface SystemMetrics {
  timestamp: string;
  totalJobs: number;
  activeJobs: number;
  runningJobs: number;
  failedJobs: number;
  successRate: number;
  avgExecutionTime: number;
  totalRecordsProcessed: number;
  totalDataSources: number;
  connectedDataSources: number;
  disconnectedDataSources: number;
  totalWeComAccounts: number;
  totalMappings: number;
}

export interface JobMetrics {
  jobId: string;
  jobName: string;
  lastExecutionTime: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgExecutionTime: number;
  lastStatus: 'success' | 'failed' | 'running';
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'job_failure' | 'job_timeout' | 'low_success_rate' | 'system_error';
  enabled: boolean;
  threshold?: number;
  notificationMethod: 'email' | 'wecom' | 'both';
  recipients: string[];
}

/**
 * 监控服务
 * 负责监控系统状态、作业执行情况并生成告警
 */
export class MonitoringService {
  private static instance: MonitoringService;
  private alertRules: AlertRule[] = [];
  private metricsHistory: SystemMetrics[] = [];
  private maxHistorySize = 100;

  private constructor() {
    this.initializeDefaultAlertRules();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * 初始化默认告警规则
   */
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'default-job-failure',
        name: '作业失败告警',
        type: 'job_failure',
        enabled: true,
        notificationMethod: 'wecom',
        recipients: []
      },
      {
        id: 'default-low-success-rate',
        name: '低成功率告警',
        type: 'low_success_rate',
        enabled: true,
        threshold: 80,
        notificationMethod: 'wecom',
        recipients: []
      },
      {
        id: 'default-system-error',
        name: '系统错误告警',
        type: 'system_error',
        enabled: true,
        notificationMethod: 'both',
        recipients: []
      }
    ];
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const jobs = await getJobs();
      const scheduledJobs = syncService.getScheduledJobs();
      const dataSourceStats = await dataSourceService.getDataSourceStats();
      const weComAccounts = getWeComAccounts();
      const mappings = getMappings();

      let totalJobs = jobs.length;
      let activeJobs = jobs.filter(j => j.enabled).length;
      let runningJobs = 0;
      let failedJobs = 0;
      let successCount = 0;
      let failureCount = 0;
      let totalExecutionTime = 0;
      let totalRecordsProcessed = 0;

      // 统计作业执行情况
      for (const job of jobs) {
        const logs = await getJobLogs(job.id);
        const recentLogs = logs.slice(-10); // 最近10次执行

        if (recentLogs.length > 0) {
          const lastLog = recentLogs[recentLogs.length - 1];
          
          if (lastLog.status === 'running') {
            runningJobs++;
          } else if (lastLog.status === 'failed') {
            failedJobs++;
          }

          recentLogs.forEach(log => {
            if (log.status === 'success') {
              successCount++;
            } else if (log.status === 'failed') {
              failureCount++;
            }

            if (log.startTime && log.endTime) {
              const startTime = new Date(log.startTime).getTime();
              const endTime = new Date(log.endTime).getTime();
              totalExecutionTime += (endTime - startTime);
            }

            totalRecordsProcessed += log.recordsProcessed || 0;
          });
        }
      }

      const totalExecutions = successCount + failureCount;
      const successRate = totalExecutions > 0 
        ? (successCount / totalExecutions) * 100 
        : 100;
      const avgExecutionTime = totalExecutions > 0 
        ? totalExecutionTime / totalExecutions 
        : 0;

      const metrics: SystemMetrics = {
        timestamp: new Date().toISOString(),
        totalJobs,
        activeJobs,
        runningJobs,
        failedJobs,
        successRate,
        avgExecutionTime,
        totalRecordsProcessed,
        totalDataSources: dataSourceStats.totalDataSources,
        connectedDataSources: dataSourceStats.connectedDataSources,
        disconnectedDataSources: dataSourceStats.disconnectedDataSources,
        totalWeComAccounts: weComAccounts.length,
        totalMappings: mappings.length
      };

      // 保存历史指标
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      return metrics;
    } catch (error) {
      Logger.error('获取系统指标失败', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 获取作业指标
   */
  async getJobMetrics(jobId: string): Promise<JobMetrics> {
    try {
      const jobs = await getJobs();
      const job = jobs.find(j => j.id === jobId);

      if (!job) {
        throw new Error('作业不存在');
      }

      const logs = await getJobLogs(jobId);
      let executionCount = logs.length;
      let successCount = 0;
      let failureCount = 0;
      let totalExecutionTime = 0;
      let lastStatus: 'success' | 'failed' | 'running' = 'success';

      logs.forEach(log => {
        if (log.status === 'success') {
          successCount++;
        } else if (log.status === 'failed') {
          failureCount++;
        } else if (log.status === 'running') {
          lastStatus = 'running';
        }

        if (log.startTime && log.endTime) {
          const startTime = new Date(log.startTime).getTime();
          const endTime = new Date(log.endTime).getTime();
          totalExecutionTime += (endTime - startTime);
        }
      });

      if (logs.length > 0) {
        const lastLog = logs[logs.length - 1];
        if (lastLog.status !== 'running') {
          lastStatus = lastLog.status as 'success' | 'failed';
        }
      }

      const successRate = executionCount > 0 
        ? (successCount / executionCount) * 100 
        : 100;
      const avgExecutionTime = executionCount > 0 
        ? totalExecutionTime / executionCount 
        : 0;

      return {
        jobId: job.id,
        jobName: job.name,
        lastExecutionTime: job.lastRun || new Date().toISOString(),
        executionCount,
        successCount,
        failureCount,
        successRate,
        avgExecutionTime,
        lastStatus
      };
    } catch (error) {
      Logger.error('获取作业指标失败', { jobId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 获取所有作业的指标
   */
  async getAllJobMetrics(): Promise<JobMetrics[]> {
    try {
      const jobs = await getJobs();
      const metrics: JobMetrics[] = [];

      for (const job of jobs) {
        const jobMetrics = await this.getJobMetrics(job.id);
        metrics.push(jobMetrics);
      }

      return metrics;
    } catch (error) {
      Logger.error('获取所有作业指标失败', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 检查告警规则
   */
  async checkAlertRules(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();
      const jobMetrics = await this.getAllJobMetrics();

      for (const rule of this.alertRules) {
        if (!rule.enabled) {
          continue;
        }

        switch (rule.type) {
          case 'job_failure':
            if (metrics.failedJobs > 0) {
              await this.triggerAlert(rule, {
                type: 'job_failure',
                message: `检测到 ${metrics.failedJobs} 个作业执行失败`,
                metrics
              });
            }
            break;

          case 'low_success_rate':
            if (rule.threshold && metrics.successRate < rule.threshold) {
              await this.triggerAlert(rule, {
                type: 'low_success_rate',
                message: `系统成功率为 ${metrics.successRate.toFixed(2)}%，低于阈值 ${rule.threshold}%`,
                metrics
              });
            }
            break;

          case 'job_timeout':
            for (const jobMetric of jobMetrics) {
              if (jobMetric.lastStatus === 'running') {
                const lastExecution = new Date(jobMetric.lastExecutionTime).getTime();
                const now = Date.now();
                const elapsed = (now - lastExecution) / 1000 / 60; // 分钟

                if (rule.threshold && elapsed > rule.threshold) {
                  await this.triggerAlert(rule, {
                    type: 'job_timeout',
                    message: `作业 ${jobMetric.jobName} 已运行 ${elapsed.toFixed(0)} 分钟，超过阈值 ${rule.threshold} 分钟`,
                    metrics: jobMetric
                  });
                }
              }
            }
            break;
        }
      }
    } catch (error) {
      Logger.error('检查告警规则失败', { error: (error as Error).message });
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(rule: AlertRule, alertData: any): Promise<void> {
    Logger.warn('触发告警', {
      ruleName: rule.name,
      type: rule.type,
      message: alertData.message
    });

    // 这里可以集成通知服务发送告警
    // 例如：邮件、企业微信等
  }

  /**
   * 添加告警规则
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    Logger.info('添加告警规则', { ruleName: rule.name });
  }

  /**
   * 删除告警规则
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
    Logger.info('删除告警规则', { ruleId });
  }

  /**
   * 获取所有告警规则
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(limit?: number): SystemMetrics[] {
    const history = [...this.metricsHistory];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }
}

// 导出单例
export const monitoringService = MonitoringService.getInstance();
