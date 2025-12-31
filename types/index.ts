// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

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
export type DatabaseType = 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  options?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseTable {
  name: string;
  schema?: string;
  columns: DatabaseColumn[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: any;
}

// 企业微信文档相关类型
export interface WeComAccount {
  id: string;
  name: string;
  corpId: string;
  corpSecret: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeComDocument {
  id: string;
  name: string;
  accessToken: string;
  documentId: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntelligentDocument {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'syncing';
  lastSyncTime?: string;
  sheetCount: number;
  sheets?: DocumentSheet[];
  createdAt: string;
  accountId: string;
}

export interface DocumentSheet {
  id: string;
  name: string;
  fields: DocumentField[];
}

export interface DocumentField {
  id: string;
  name: string;
  type: string;
}

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
  entityType: 'database' | 'document' | 'job' | 'user' | 'wecom_account';
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

// 数据映射相关类型
export type MappingStatus = 'active' | 'inactive' | 'draft';

export interface MappingConfig {
  id: string;
  name: string;
  sourceDatabaseId: string;
  sourceTableName: string;
  targetDocId: string;
  targetSheetId: string;
  status: MappingStatus;
  fieldMappings: FieldMapping[];
  createdAt: string;
  updatedAt: string;
  lastSyncTime?: string;
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
