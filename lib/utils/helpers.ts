import bcrypt from 'bcrypt';
import crypto from 'crypto';

// 密码加密
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// ID生成
export function generateId(): string {
  return crypto.randomUUID();
}

// 数据脱敏
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) {
    return '******';
  }
  return data.substring(0, visibleChars) + '******';
}

// 日期格式化
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 验证密码强度
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少为8位' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个大写字母' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个小写字母' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个数字' };
  }
  
  return { valid: true };
}

// Cron表达式验证
export function validateCronExpression(cron: string): boolean {
  const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
  return cronRegex.test(cron);
}

// 计算下次执行时间
export function getNextRunTime(cron: string): Date | null {
  try {
    // 简单的cron解析（实际项目中应使用更完善的cron库）
    const parts = cron.split(' ');
    if (parts.length !== 5) return null;
    
    const now = new Date();
    const nextRun = new Date(now);
    
    // 这里简化处理，实际应使用完整的cron解析库
    nextRun.setMinutes(nextRun.getMinutes() + 1);
    
    return nextRun;
  } catch (error) {
    return null;
  }
}

// 错误日志记录
export class Logger {
  private static log(level: string, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta })
    };
    
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, meta || '');
    
    // 可以将日志写入文件
    // fs.appendFileSync('logs/app.log', JSON.stringify(logEntry) + '\n');
  }
  
  static info(message: string, meta?: any) {
    this.log('info', message, meta);
  }
  
  static warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }
  
  static error(message: string, meta?: any) {
    this.log('error', message, meta);
  }
  
  static debug(message: string, meta?: any) {
    this.log('debug', message, meta);
  }
}

// API响应构建器
export function buildSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message
  };
}

export function buildErrorResponse(error: string, message?: string) {
  return {
    success: false,
    error,
    message
  };
}

// 分页处理
export function paginate<T>(items: T[], page: number, pageSize: number) {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    items: items.slice(startIndex, endIndex),
    total: items.length,
    page,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize)
  };
}

// 延迟函数
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 重试机制
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      Logger.warn(`Retry attempt ${i + 1}/${maxRetries}`, { error: lastError.message });
      
      if (i < maxRetries - 1) {
        await delay(delayMs * (i + 1)); // 指数退避
      }
    }
  }
  
  throw lastError!;
}

// 数据验证
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldName} 不能为空`);
  }
}

export function validatePort(port: number): void {
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error('端口号必须在1-65535之间');
  }
}

// 字符串截断
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

// 生成随机字符串
export function generateRandomString(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

// URL验证
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// 深度克隆对象
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 计算持续时间
export function formatDuration(startTime: Date, endTime: Date): string {
  const diff = endTime.getTime() - startTime.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}
