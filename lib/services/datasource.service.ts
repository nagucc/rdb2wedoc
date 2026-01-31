import { getDatabases, getJobs, getJobLogs, getMappings } from '@/lib/config/storage';
import { DatabaseConnection, SyncJob } from '@/types';
import { Logger } from '@/lib/utils/helpers';

export interface DataSourceMetrics {
  dataSourceId: string;
  dataSourceName: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  connectionSuccessRate: number;
  lastSyncTime: string;
  syncFrequency: string;
  totalQueries: number;
  totalDataTransferred: number;
  avgQueryTime: number;
  healthScore: number;
  createdAt: string;
}

export interface DataSourceStats {
  totalDataSources: number;
  connectedDataSources: number;
  disconnectedDataSources: number;
  errorDataSources: number;
  avgConnectionSuccessRate: number;
  totalQueries: number;
  totalDataTransferred: number;
  queryTrend: number[];
  dataFlowDistribution: { type: string; value: number }[];
}

export class DataSourceService {
  private static instance: DataSourceService;
  private metricsHistory: DataSourceMetrics[] = [];
  private queryHistory: Map<string, number[]> = new Map();
  private maxHistorySize = 100;

  private constructor() {}

  static getInstance(): DataSourceService {
    if (!DataSourceService.instance) {
      DataSourceService.instance = new DataSourceService();
    }
    return DataSourceService.instance;
  }

  async getDataSourceMetrics(dataSourceId: string): Promise<DataSourceMetrics> {
    try {
      const databases = getDatabases();
      const dataSource = databases.find(db => db.id === dataSourceId);

      if (!dataSource) {
        throw new Error('数据源不存在');
      }

      const mappings = getMappings();
      const relevantMappingIds = mappings
        .filter(m => m.sourceDatabaseId === dataSourceId)
        .map(m => m.id);
      const jobs = getJobs().filter(job => job.mappingConfigId && relevantMappingIds.includes(job.mappingConfigId));
      
      let connectionSuccessRate = 100;
      let totalQueries = 0;
      let totalDataTransferred = 0;
      let totalQueryTime = 0;
      let lastSyncTime = new Date().toISOString();
      let connectionStatus: 'connected' | 'disconnected' | 'error' = 'connected';

      for (const job of jobs) {
        const logs = await getJobLogs(job.id);
        
        for (const log of logs) {
          totalQueries++;
          totalDataTransferred += log.recordsProcessed || 0;
          
          if (log.status === 'success') {
            if (log.startTime && log.endTime) {
              const startTime = new Date(log.startTime).getTime();
              const endTime = new Date(log.endTime).getTime();
              totalQueryTime += (endTime - startTime);
            }
            
            if (new Date(log.startTime) > new Date(lastSyncTime)) {
              lastSyncTime = log.startTime;
            }
          } else if (log.status === 'failed') {
            connectionSuccessRate -= 2;
            connectionStatus = 'error';
          }
        }
        
        if (job.status === 'failed') {
          connectionStatus = 'error';
        }
      }

      connectionSuccessRate = Math.max(0, Math.min(100, connectionSuccessRate));
      
      const avgQueryTime = totalQueries > 0 ? totalQueryTime / totalQueries : 0;
      
      const healthScore = this.calculateHealthScore(
        connectionSuccessRate,
        avgQueryTime,
        connectionStatus
      );

      const syncFrequency = this.calculateSyncFrequency(jobs);

      const metrics: DataSourceMetrics = {
        dataSourceId,
        dataSourceName: dataSource.name,
        connectionStatus,
        connectionSuccessRate,
        lastSyncTime,
        syncFrequency,
        totalQueries,
        totalDataTransferred,
        avgQueryTime,
        healthScore,
        createdAt: dataSource.createdAt
      };

      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      return metrics;
    } catch (error) {
      Logger.error('获取数据源指标失败', { dataSourceId, error: (error as Error).message });
      throw error;
    }
  }

  async getAllDataSourceMetrics(): Promise<DataSourceMetrics[]> {
    try {
      const databases = getDatabases();
      const metrics: DataSourceMetrics[] = [];

      for (const db of databases) {
        const dbMetrics = await this.getDataSourceMetrics(db.id);
        metrics.push(dbMetrics);
      }

      return metrics;
    } catch (error) {
      Logger.error('获取所有数据源指标失败', { error: (error as Error).message });
      throw error;
    }
  }

  async getDataSourceStats(): Promise<DataSourceStats> {
    try {
      const allMetrics = await this.getAllDataSourceMetrics();

      const connectedDataSources = allMetrics.filter(m => m.connectionStatus === 'connected').length;
      const disconnectedDataSources = allMetrics.filter(m => m.connectionStatus === 'disconnected').length;
      const errorDataSources = allMetrics.filter(m => m.connectionStatus === 'error').length;
      
      const avgConnectionSuccessRate = allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.connectionSuccessRate, 0) / allMetrics.length
        : 100;

      const totalQueries = allMetrics.reduce((sum, m) => sum + m.totalQueries, 0);
      const totalDataTransferred = allMetrics.reduce((sum, m) => sum + m.totalDataTransferred, 0);

      const queryTrend = this.generateQueryTrend();
      const dataFlowDistribution = this.generateDataFlowDistribution(allMetrics);

      return {
        totalDataSources: allMetrics.length,
        connectedDataSources,
        disconnectedDataSources,
        errorDataSources,
        avgConnectionSuccessRate,
        totalQueries,
        totalDataTransferred,
        queryTrend,
        dataFlowDistribution
      };
    } catch (error) {
      Logger.error('获取数据源统计失败', { error: (error as Error).message });
      throw error;
    }
  }

  private calculateHealthScore(
    connectionSuccessRate: number,
    avgQueryTime: number,
    connectionStatus: 'connected' | 'disconnected' | 'error'
  ): number {
    let score = 100;

    if (connectionStatus === 'error') {
      score -= 50;
    } else if (connectionStatus === 'disconnected') {
      score -= 30;
    }

    score -= (100 - connectionSuccessRate) * 0.5;

    if (avgQueryTime > 5000) {
      score -= 20;
    } else if (avgQueryTime > 2000) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateSyncFrequency(jobs: SyncJob[]): string {
    if (jobs.length === 0) return '无';

    const enabledJobs = jobs.filter(job => job.enabled);
    if (enabledJobs.length === 0) return '已暂停';

    const scheduleCounts = enabledJobs.reduce((acc, job) => {
      const schedule = job.schedule;
      acc[schedule] = (acc[schedule] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostFrequent = Object.entries(scheduleCounts)
      .sort((a, b) => b[1] - a[1])[0];

    if (!mostFrequent) return '未知';

    const schedule = mostFrequent[0];
    if (schedule.includes('* * * * *')) return '每分钟';
    if (schedule.includes('*/5 * * * *')) return '每5分钟';
    if (schedule.includes('*/15 * * * *')) return '每15分钟';
    if (schedule.includes('*/30 * * * *')) return '每30分钟';
    if (schedule.includes('0 * * * *')) return '每小时';
    if (schedule.includes('0 0 * * *')) return '每天';
    if (schedule.includes('0 0 * * 0')) return '每周';

    return '自定义';
  }

  private generateQueryTrend(): number[] {
    const days = 7;
    const trend = [];
    for (let i = 0; i < days; i++) {
      trend.push(Math.floor(Math.random() * 500) + 100);
    }
    return trend;
  }

  private generateDataFlowDistribution(metrics: DataSourceMetrics[]): { type: string; value: number }[] {
    const distribution = metrics.map(m => ({
      type: m.dataSourceName,
      value: m.totalDataTransferred
    }));

    return distribution.sort((a, b) => b.value - a.value).slice(0, 5);
  }

  getMetricsHistory(limit?: number): DataSourceMetrics[] {
    const history = [...this.metricsHistory];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }
}

export const dataSourceService = DataSourceService.getInstance();