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

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
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
  comment?: string;
}

export type DatabaseField = DatabaseColumn;

// 企业微信账号配置接口
export interface WeComAccount {
  /** 账号唯一标识 */
  id: string;
  /** 账号名称（便于识别） */
  name: string;
  /** 企业微信企业ID */
  corpId: string;
  /** 企业微信应用密钥 */
  corpSecret: string;
  /** 是否启用该账号 */
  enabled: boolean;
  /** 创建时间（ISO 字符串） */
  createdAt: string;
  /** 最后更新时间（ISO 字符串） */
  updatedAt: string;
}

// 企业微信文档接口
export interface WeComDocument {
  /** 文档唯一标识，也是文档的docid */
  id: string;
  /** 文档名称 */
  name: string;
  /** 所属企业微信账号ID（不是corpId） */
  accountId: string;
  /** 创建时间（ISO 字符串） */
  createdAt: string;
  /** 最后更新时间（ISO 字符串） */
  updatedAt: string;
}

export interface WecomSmartSheet {
  id: string;
  name: string;
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
  description?: string;
}

// 同步作业相关类型
export type SyncStatus = 'idle' | 'running' | 'success' | 'failed' | 'paused' | 'resuming';
export type ConflictStrategy = 'overwrite' | 'append' | 'ignore' | 'merge' | 'skip' | 'error';
export type SyncMode = 'full' | 'incremental' | 'paged';
export type IncrementalType = 'timestamp' | 'id' | 'custom';
export type FieldConflictStrategy = 'overwrite' | 'preserve' | 'merge' | 'skip';

export interface SyncJob {
  id: string;
  name: string;
  description?: string;
  mappingConfigId: string; // 必填，引用的数据映射配置ID
  schedule: string; // cron expression
  scheduleTemplate?: string; // 调度模板名称
  status: SyncStatus;
  conflictStrategy: ConflictStrategy;
  syncMode: SyncMode; // 同步模式：全量、增量、分页
  incrementalType?: IncrementalType; // 增量同步类型
  incrementalField?: string; // 增量字段名
  pageSize?: number; // 分页大小
  enableResume?: boolean; // 是否启用断点续传
  lastSyncPosition?: string; // 最后同步位置
  fieldConflictStrategies?: Array<{ fieldName: string; strategy: FieldConflictStrategy }>; // 字段级别的冲突策略
  syncTimeout?: number; // 同步超时时间（秒）
  maxRecordsPerSync?: number; // 单次同步最大记录数
  enableDataValidation?: boolean; // 是否启用数据验证
  lastRun?: string;
  nextRun?: string;
  lastError?: string;
  lastErrorTime?: string;
  enabled: boolean;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface FieldMapping {
  databaseColumn: string;
  documentField: string;
  documentFieldId?: string;
  transform?: string;
  conflictStrategy?: FieldConflictStrategy; // 字段级别的冲突策略
  dataType?: string;
  defaultValue?: string;
  validation?: string; // 数据验证规则
}

export interface FieldMappingUI extends FieldMapping {
  id: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'json';
  defaultValue?: string;
  description?: string;
}

export interface ValidationError {
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: any;
}

export interface SyncProgress {
  jobId: string;
  status: SyncStatus;
  progress: number;
  currentRecord: number;
  totalRecords: number;
  currentPage?: number;
  totalPages?: number;
  startTime: string;
  estimatedEndTime?: string;
}

export interface ScheduleTemplate {
  name: string;
  label: string;
  cronExpression: string;
  description: string;
}

export interface FieldConflictConfig {
  fieldName: string;
  strategy: FieldConflictStrategy;
  mergeExpression?: string;
}

export interface PaginationConfig {
  enabled: boolean;
  pageSize: number;
  enableResume: boolean;
  lastSyncPosition?: string;
  maxRecordsPerSync?: number;
}

export interface IncrementalConfig {
  enabled: boolean;
  type: IncrementalType;
  field?: string;
  lastSyncValue?: string;
}

export interface DataValidationConfig {
  enabled: boolean;
  rules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'pattern' | 'range' | 'custom';
  pattern?: string;
  min?: number;
  max?: number;
  customScript?: string;
  errorMessage?: string;
}

export interface SyncJobConfig {
  syncMode: SyncMode;
  conflictStrategy: ConflictStrategy;
  pagination?: PaginationConfig;
  incremental?: IncrementalConfig;
  dataValidation?: DataValidationConfig;
  fieldConflicts?: FieldConflictConfig[];
  syncTimeout?: number;
  maxRetries?: number;
}

export interface ExecutionLog {
  id: string;
  jobId: string;
  status: SyncStatus;
  startTime: string;
  endTime?: string;
  duration?: number; // 执行时长（毫秒）
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  recordsSkipped?: number;
  errorMessage?: string;
  retryAttempt?: number;
  syncMode?: SyncMode;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  conflictCount?: number;
  validationErrors?: ValidationError[];
  progress?: number; // 进度百分比
  logs?: LogEntry[]; // 详细日志条目
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
export interface MappingConfig {
  id: string;
  name: string;
  sourceDatabaseId: string;
  sourceTableName: string;
  targetDocId: string;
  targetSheetId: string;
  fieldMappings: FieldMapping[];
  createdAt: string;
  updatedAt: string;
  lastSyncTime?: string;
  corpId?: string;
  targetName?: string;
  documentName?: string;
  sheetName?: string;
}

export interface MappingConfigUI extends Omit<MappingConfig, 'fieldMappings'> {
  fieldMappings: FieldMappingUI[];
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
