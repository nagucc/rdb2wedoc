import * as cron from 'node-cron';
import { databaseService } from './database.service';
import { weComDocumentService } from './wecom-document.service';
import { SyncJob, FieldMapping, ConflictStrategy, ExecutionLog, WeComDocument, MappingConfig } from '@/types';
import { getDatabaseById, getDocumentById, saveJob, saveLog, getJobById, getMappingById, getWeComAccountById } from '../config/storage';
import { Logger, generateId, formatDate, retry } from '../utils/helpers';

export class SyncService {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private runningJobs: Map<string, boolean> = new Map();

  async executeJob(jobId: string): Promise<ExecutionLog> {
    const job = await getJobById(jobId);
    if (!job) {
      throw new Error(`作业不存在: ${jobId}`);
    }

    if (this.runningJobs.get(jobId)) {
      throw new Error(`作业正在运行中: ${job.name}`);
    }

    const log: ExecutionLog = {
      id: generateId(),
      jobId,
      status: 'running',
      startTime: new Date().toISOString(),
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      retryAttempt: job.retryCount
    };

    this.runningJobs.set(jobId, true);

    try {
      // 更新作业状态
      job.status = 'running';
      job.lastRun = log.startTime;
      await saveJob(job);

      // 获取映射配置
      const mappingConfig = getMappingById(job.mappingConfigId);
      if (!mappingConfig) {
        throw new Error('映射配置不存在');
      }

      // 获取数据源和文档配置
      const database = await getDatabaseById(mappingConfig.sourceDatabaseId);
      const document = await getDocumentById(mappingConfig.targetDocId);

      if (!database || !document) {
        throw new Error('数据源或文档配置不存在');
      }

      // 从数据库读取数据
      Logger.info('读取数据库数据', { 
        table: mappingConfig.sourceTableName,
        mongoMappingType: mappingConfig.mongoMappingType,
        mongoArrayField: mappingConfig.mongoArrayField 
      });
      const dbData = await this.readFromDatabase(database, mappingConfig.sourceTableName, mappingConfig);
      Logger.info('数据库数据读取完成', { recordCount: dbData.length, sampleData: dbData.slice(0, 2) });
      log.recordsProcessed = dbData.length;

      // 获取文档字段类型映射
      const fieldTypeMap = await this.getDocumentFields(document, mappingConfig.targetSheetId);

      // 转换数据格式
      const transformedData = this.transformData(dbData, mappingConfig.fieldMappings, fieldTypeMap, mappingConfig);
      Logger.info('数据转换完成', { 
        recordCount: transformedData.length, 
        sampleTransformed: transformedData.slice(0, 2) 
      });

      // 根据冲突策略写入文档
      if (job.conflictStrategy === 'overwrite') {
        await this.overwriteToDocument(document, mappingConfig.targetSheetId, transformedData, fieldTypeMap);
      } else if (job.conflictStrategy === 'append') {
        await this.appendToDocument(document, mappingConfig.targetSheetId, transformedData, fieldTypeMap);
      } else {
        await this.mergeToDocument(document, mappingConfig.targetSheetId, transformedData, fieldTypeMap);
      }

      log.recordsSucceeded = transformedData.length;
      log.status = 'success';
      log.endTime = new Date().toISOString();
      log.duration = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();

      // 更新作业状态
      job.status = 'idle';
      job.retryCount = 0;
      await saveJob(job);

      Logger.info(`同步作业执行成功: ${job.name}`, {
        jobId,
        recordsProcessed: log.recordsProcessed,
        recordsSucceeded: log.recordsSucceeded
      });

    } catch (error) {
      log.status = 'failed';
      log.endTime = new Date().toISOString();
      log.duration = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
      log.errorMessage = (error as Error).message;
      log.recordsFailed = log.recordsProcessed - log.recordsSucceeded;

      // 更新作业状态为失败
      job.status = 'failed';
      job.lastError = log.errorMessage;
      job.lastErrorTime = log.endTime;
      job.retryCount++;

      // 如果未达到最大重试次数，则重试
      if (job.retryCount <= job.maxRetries) {
        Logger.warn(`同步作业失败，准备重试: ${job.name}`, {
          jobId,
          retryAttempt: job.retryCount,
          maxRetries: job.maxRetries,
          error: log.errorMessage,
          errorTime: log.endTime
        });

        // 保存失败状态后再重试
        await saveJob(job);

        try {
          await retry(() => this.executeJob(jobId), 1, 5000);
        } catch (retryError) {
          // 重试失败，状态已在递归调用中更新为 'failed'
          Logger.error(`同步作业重试失败: ${job.name}`, {
            jobId,
            retryAttempt: job.retryCount,
            maxRetries: job.maxRetries,
            error: (retryError as Error).message
          });
        }
      } else {
        // 达到最大重试次数，确保状态为失败
        job.status = 'failed';
        job.lastError = log.errorMessage;
        job.lastErrorTime = log.endTime;
        
        Logger.error(`同步作业执行失败，已达最大重试次数: ${job.name}`, {
          jobId,
          retryAttempt: job.retryCount,
          maxRetries: job.maxRetries,
          error: log.errorMessage,
          errorTime: log.endTime,
          recordsProcessed: log.recordsProcessed,
          recordsSucceeded: log.recordsSucceeded,
          recordsFailed: log.recordsFailed
        });

        await saveJob(job);
      }
    } finally {
      this.runningJobs.delete(jobId);
      await saveLog(log);
    }

    return log;
  }

  private async readFromDatabase(database: any, table: string, mappingConfig?: MappingConfig): Promise<any[]> {
    if (database.type === 'mongodb') {
      if (mappingConfig?.mongoMappingType === 'array_expand' && mappingConfig.mongoArrayField) {
        const arrayField = mappingConfig.mongoArrayField.endsWith('[]')
          ? mappingConfig.mongoArrayField.slice(0, -2)
          : mappingConfig.mongoArrayField;
        Logger.debug('执行数组展开聚合', { arrayField });
        return await databaseService.mongoAggregate(database, table, [
          { $unwind: `$${arrayField}` },
          { $limit: 10000 }
        ]);
      }
      return await databaseService.mongoQuery(database, table);
    } else {
      const sql = `SELECT * FROM ${table}`;
      return await databaseService.query(database, sql);
    }
  }

  private async getDocumentFields(document: WeComDocument, sheetId: string): Promise<Map<string, string>> {
    try {
      const account = getWeComAccountById(document.accountId);
      if (!account) {
        throw new Error(`关联的企业微信账号不存在，accountId: ${document.accountId}`);
      }

      const accessToken = await weComDocumentService.getAccessToken(account.corpId, account.corpSecret);
      const fields = await weComDocumentService.getSheetFields(accessToken, document.id, sheetId);
      
      const fieldTypeMap = new Map<string, string>();
      fields.forEach(field => {
        fieldTypeMap.set(field.name, field.type);
      });
      
      return fieldTypeMap;
    } catch (error) {
      Logger.error('获取文档字段失败', { error: (error as Error).message });
      return new Map<string, string>();
    }
  }

  private transformData(data: any[], mappings: FieldMapping[], fieldTypeMap: Map<string, string>, mappingConfig?: MappingConfig): any[] {
    const arrayExpandMode = mappingConfig?.mongoMappingType === 'array_expand' && mappingConfig.mongoArrayField;
    
    const normalizedArrayField = arrayExpandMode 
      ? mappingConfig?.mongoArrayField?.endsWith('[]') 
        ? mappingConfig.mongoArrayField!.slice(0, -2)
        : mappingConfig.mongoArrayField
      : undefined;
    
    if (arrayExpandMode) {
      Logger.info('数组展开模式转换数据', { 
        mongoArrayField: mappingConfig.mongoArrayField,
        normalizedArrayField,
        mappingCount: mappings.length,
        mappings: mappings.map(m => ({ databaseColumn: m.databaseColumn, documentField: m.documentField }))
      });
    }
    
    return data.map(row => {
      const transformed: any = {};
      
      mappings.forEach(mapping => {
        let value = row[mapping.databaseColumn];
        
        if (value === undefined && arrayExpandMode) {
          const arrayPrefix = `${normalizedArrayField}[]`;
          if (mapping.databaseColumn.startsWith(arrayPrefix)) {
            const fieldPath = mapping.databaseColumn.slice(arrayPrefix.length + 1);
            value = this.getNestedValue(row, `${normalizedArrayField}.${fieldPath}`);
            Logger.debug('数组展开模式-嵌套字段值获取', { 
              databaseColumn: mapping.databaseColumn, 
              normalizedArrayField,
              fieldPath, 
              actualPath: `${normalizedArrayField}.${fieldPath}`,
              value 
            });
          } else if (normalizedArrayField && (mapping.databaseColumn === normalizedArrayField || mapping.databaseColumn === `${normalizedArrayField}[]`)) {
            value = row[normalizedArrayField!] ?? row[`${normalizedArrayField}[]`];
          }
        }
        
        const fieldType = fieldTypeMap.get(mapping.documentField);
        
        if (mapping.transform) {
          try {
            transformed[mapping.documentField] = this.applyTransform(value, mapping.transform);
          } catch (error) {
            Logger.warn('数据转换失败', { value, transform: mapping.transform });
            transformed[mapping.documentField] = value;
          }
        } else if (fieldType) {
          transformed[mapping.documentField] = this.autoConvertType(value, fieldType);
        } else {
          transformed[mapping.documentField] = value;
        }
      });
      
      return transformed;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    try {
      const keys = path.split('.');
      let current: any = obj;
      
      for (const key of keys) {
        if (current === null || current === undefined) {
          Logger.debug('路径访问中断，属性不存在', { path, currentKey: key, currentValue: current });
          return undefined;
        }
        current = current[key];
      }
      
      return current;
    } catch (error) {
      Logger.warn('获取嵌套值失败', { path, error: (error as Error).message });
      return undefined;
    }
  }

  private autoConvertType(value: any, fieldType: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      if (fieldType === 'text' || fieldType === 'phone' || fieldType === 'email' || 
          fieldType === 'url' || fieldType === 'select' || fieldType === 'multi_select') {
        return JSON.stringify(value);
      }
      return value;
    }

    try {
      switch (fieldType) {
        case 'number':
        case 'currency':
        case 'percentage':
          return Number(value);
        case 'datetime':
          return new Date(value).toISOString();
        case 'boolean':
          return Boolean(value);
        case 'text':
        case 'phone':
        case 'email':
        case 'url':
        case 'select':
        case 'multi_select':
        case 'user':
        case 'group':
        case 'reference':
        case 'location':
        case 'formula':
        case 'image':
        case 'file':
        case 'barcode':
          return String(value);
        default:
          // 不支持的类型，保持原值
          Logger.warn('不支持的字段类型，保持原值', { fieldType, value });
          return value;
      }
    } catch (error) {
      Logger.warn('类型转换失败，保持原值', { fieldType, value, error: (error as Error).message });
      return value;
    }
  }

  private applyTransform(value: any, transform: string): any {
    // 简单的转换函数
    const transforms: Record<string, (val: any) => any> = {
      'toString': (val: any) => String(val),
      'toNumber': (val: any) => Number(val),
      'toUpperCase': (val: any) => String(val).toUpperCase(),
      'toLowerCase': (val: any) => String(val).toLowerCase(),
      'trim': (val: any) => String(val).trim(),
      'toDate': (val: any) => new Date(val).toISOString(),
      'toBoolean': (val: any) => Boolean(val)
    };

    const transformFn = transforms[transform];
    if (transformFn) {
      return transformFn(value);
    }

    return value;
  }

  private async overwriteToDocument(document: WeComDocument, sheetId: string, data: any[], fieldTypeMap?: Map<string, string>): Promise<void> {
    // 根据document.accountId获取corpid和corpsecret
    const account = getWeComAccountById(document.accountId);
    if (!account) {
      throw new Error(`关联的企业微信账号不存在，accountId: ${document.accountId}`);
    }

    const accessToken = await weComDocumentService.getAccessToken(account.corpId, account.corpSecret);
    if (!accessToken) {
      throw new Error(`获取企业微信access token失败, corpId: ${account.corpId}`);
    }
    await weComDocumentService.clearSheetData(accessToken, document.id, sheetId);
    await weComDocumentService.writeSheetData(accessToken, document.id, sheetId, data, fieldTypeMap);
  }

  private async appendToDocument(document: WeComDocument, sheetId: string, data: any[], fieldTypeMap?: Map<string, string>): Promise<void> {
    const account = getWeComAccountById(document.accountId);
    if (!account) {
      throw new Error(`关联的企业微信账号不存在，accountId: ${document.accountId}`);
    }

    const accessToken = await weComDocumentService.getAccessToken(account.corpId, account.corpSecret);
    if (!accessToken) {
      throw new Error(`获取企业微信access token失败, corpId: ${account.corpId}`);
    }
    await weComDocumentService.appendSheetData(accessToken, document.id, sheetId, data, fieldTypeMap);
  }

  private async mergeToDocument(document: WeComDocument, sheetId: string, data: any[], fieldTypeMap?: Map<string, string>): Promise<void> {
    await this.overwriteToDocument(document, sheetId, data, fieldTypeMap);
  }

  scheduleJob(job: SyncJob): void {
    // 停止已存在的调度任务
    this.unscheduleJob(job.id);

    if (!job.enabled) {
      return;
    }

    try {
      // 使用node-cron调度任务
      const task = cron.schedule(job.schedule, async () => {
        try {
          await this.executeJob(job.id);
        } catch (error) {
          Logger.error(`调度任务执行失败: ${job.name}`, { error: (error as Error).message });
        }
      });

      this.scheduledJobs.set(job.id, task);

      Logger.info(`同步作业已调度: ${job.name}`, { jobId: job.id, schedule: job.schedule });
    } catch (error) {
      Logger.error(`调度同步作业失败: ${job.name}`, { error: (error as Error).message });
      throw error;
    }
  }

  unscheduleJob(jobId: string): void {
    const task = this.scheduledJobs.get(jobId);
    if (task) {
      task.stop();
      this.scheduledJobs.delete(jobId);
      Logger.info(`同步作业已取消调度: ${jobId}`);
    }
  }

  async startAllJobs(): Promise<void> {
    const jobs = await getJobById('');
    // 这里需要从存储中获取所有启用的作业
    // 简化实现，实际需要修改getJobById或创建新方法
    Logger.info('启动所有同步作业');
  }

  stopAllJobs(): void {
    this.scheduledJobs.forEach((task, jobId) => {
      task.stop();
      Logger.info(`同步作业已停止: ${jobId}`);
    });
    this.scheduledJobs.clear();
  }

  getScheduledJobs(): string[] {
    return Array.from(this.scheduledJobs.keys());
  }

  isJobRunning(jobId: string): boolean {
    return this.runningJobs.get(jobId) || false;
  }

  async previewData(job: SyncJob, limit: number = 10): Promise<any[]> {
    try {
      const mappingConfig = getMappingById(job.mappingConfigId);
      if (!mappingConfig) {
        throw new Error('映射配置不存在');
      }

      const database = await getDatabaseById(mappingConfig.sourceDatabaseId);
      if (!database) {
        throw new Error('数据源配置不存在');
      }

      const document = await getDocumentById(mappingConfig.targetDocId);
      if (!document) {
        throw new Error('目标文档配置不存在');
      }

      let dbData: any[];
      if (database.type === 'mongodb') {
        if (mappingConfig.mongoMappingType === 'array_expand' && mappingConfig.mongoArrayField) {
          const arrayField = mappingConfig.mongoArrayField.endsWith('[]')
            ? mappingConfig.mongoArrayField.slice(0, -2)
            : mappingConfig.mongoArrayField;
          dbData = await databaseService.mongoAggregate(database, mappingConfig.sourceTableName, [
            { $unwind: `$${arrayField}` },
            { $limit: limit }
          ]);
        } else {
          dbData = await databaseService.mongoQuery(database, mappingConfig.sourceTableName, undefined, { limit });
        }
      } else {
        const sql = `SELECT * FROM ${mappingConfig.sourceTableName} LIMIT ${limit}`;
        dbData = await databaseService.query(database, sql);
      }
      
      // 获取文档字段类型映射
      const fieldTypeMap = await this.getDocumentFields(document, mappingConfig.targetSheetId);
      
      return this.transformData(dbData, mappingConfig.fieldMappings, fieldTypeMap, mappingConfig);
    } catch (error) {
      Logger.error('预览数据失败', { error: (error as Error).message });
      throw error;
    }
  }
}

// 单例模式
export const syncService = new SyncService();
