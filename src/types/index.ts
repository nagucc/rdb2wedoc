// 用户相关类型

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserRegister {
  username: string;
  email: string;
  password: string;
}

// 数据库相关类型

// 企业微信文档相关类型

// 同步作业相关类型
export type SyncStatus = 'idle' | 'running' | 'success' | 'failed' | 'paused';
export type ConflictStrategy = 'overwrite' | 'append' | 'ignore';

export interface SyncJob {
  id: string;
  name: string;
  description?: string;
  databaseId: string;
  documentId: string;
  table: string;
  sheetId: string;
  fieldMappings: FieldMapping[];
  schedule: string; // cron expression
  status: SyncStatus;
  conflictStrategy: ConflictStrategy;
  lastRun?: string;
  nextRun?: string;
  enabled: boolean;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface FieldMapping {
  databaseColumn: string;
  documentField: string;
  transform?: string;
}

// 执行日志相关类型
export interface ExecutionLog {
  id: string;
  jobId: string;
  status: SyncStatus;
  startTime: string;
  endTime?: string;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorMessage?: string;
  retryAttempt?: number;
}

// 配置历史记录
export interface ConfigHistory {
  id: string;
  entityType: 'database' | 'document' | 'job';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  oldConfig?: any;
  newConfig?: any;
  userId: string;
  timestamp: string;
}

// 通知相关类型
export type NotificationType = 'system' | 'email';

export interface NotificationConfig {
  id: string;
  userId: string;
  type: NotificationType;
  enabled: boolean;
  email?: string;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
}

// 模板相关类型
export interface JobTemplate {
  id: string;
  name: string;
  description?: string;
  config: Partial<SyncJob>;
  createdAt: string;
  updatedAt: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页类型
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
