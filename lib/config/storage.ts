import fs from 'fs';
import path from 'path';
import { DatabaseConnection, WeComDocument, SyncJob, User, ConfigHistory, NotificationConfig, JobTemplate } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// 确保数据目录存在
export function ensureDataDir() {
  const dirs = [
    path.join(DATA_DIR, 'users'),
    path.join(DATA_DIR, 'databases'),
    path.join(DATA_DIR, 'documents'),
    path.join(DATA_DIR, 'jobs'),
    path.join(DATA_DIR, 'logs'),
    path.join(DATA_DIR, 'backups'),
    path.join(DATA_DIR, 'history'),
    path.join(DATA_DIR, 'templates'),
    path.join(DATA_DIR, 'notifications'),
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 通用文件操作函数
export function readJsonFile<T>(filePath: string): T | null {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
  return null;
}

export function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

export function deleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
  return false;
}

export function listFiles(dirPath: string): string[] {
  try {
    if (fs.existsSync(dirPath)) {
      return fs.readdirSync(dirPath).filter(file => file.endsWith('.json'));
    }
  } catch (error) {
    console.error(`Error listing directory ${dirPath}:`, error);
  }
  return [];
}

// 用户管理
export function getUserFilePath(userId: string): string {
  return path.join(DATA_DIR, 'users', `${userId}.json`);
}

export function getUsers(): User[] {
  const files = listFiles(path.join(DATA_DIR, 'users'));
  const users: User[] = [];
  
  files.forEach(file => {
    const user = readJsonFile<User>(path.join(DATA_DIR, 'users', file));
    if (user) {
      users.push(user);
    }
  });
  
  return users;
}

export function getUserById(userId: string): User | null {
  return readJsonFile<User>(getUserFilePath(userId));
}

export function getUserByUsername(username: string): User | null {
  const users = getUsers();
  return users.find(user => user.username === username) || null;
}

export function getUserByEmail(email: string): User | null {
  const users = getUsers();
  return users.find(user => user.email === email) || null;
}

export function saveUser(user: User): boolean {
  return writeJsonFile(getUserFilePath(user.id), user);
}

export function deleteUser(userId: string): boolean {
  return deleteFile(getUserFilePath(userId));
}

// 数据库连接管理
export function getDatabaseFilePath(dbId: string): string {
  return path.join(DATA_DIR, 'databases', `${dbId}.json`);
}

export function getDatabases(): DatabaseConnection[] {
  const files = listFiles(path.join(DATA_DIR, 'databases'));
  const databases: DatabaseConnection[] = [];
  
  files.forEach(file => {
    const db = readJsonFile<DatabaseConnection>(path.join(DATA_DIR, 'databases', file));
    if (db) {
      // 脱敏密码
      databases.push({
        ...db,
        password: '******'
      });
    }
  });
  
  return databases;
}

export function getDatabaseById(dbId: string): DatabaseConnection | null {
  return readJsonFile<DatabaseConnection>(getDatabaseFilePath(dbId));
}

export function saveDatabase(database: DatabaseConnection): boolean {
  return writeJsonFile(getDatabaseFilePath(database.id), database);
}

export function deleteDatabase(dbId: string): boolean {
  return deleteFile(getDatabaseFilePath(dbId));
}

// 企业微信文档管理
export function getDocumentFilePath(docId: string): string {
  return path.join(DATA_DIR, 'documents', `${docId}.json`);
}

export function getDocuments(): WeComDocument[] {
  const files = listFiles(path.join(DATA_DIR, 'documents'));
  const documents: WeComDocument[] = [];
  
  files.forEach(file => {
    const doc = readJsonFile<WeComDocument>(path.join(DATA_DIR, 'documents', file));
    if (doc) {
      // 脱敏token
      documents.push({
        ...doc,
        accessToken: '******'
      });
    }
  });
  
  return documents;
}

export function getDocumentById(docId: string): WeComDocument | null {
  return readJsonFile<WeComDocument>(getDocumentFilePath(docId));
}

export function saveDocument(document: WeComDocument): boolean {
  return writeJsonFile(getDocumentFilePath(document.id), document);
}

export function deleteDocument(docId: string): boolean {
  return deleteFile(getDocumentFilePath(docId));
}

// 同步作业管理
export function getJobFilePath(jobId: string): string {
  return path.join(DATA_DIR, 'jobs', `${jobId}.json`);
}

export function getJobs(): SyncJob[] {
  const files = listFiles(path.join(DATA_DIR, 'jobs'));
  const jobs: SyncJob[] = [];
  
  files.forEach(file => {
    const job = readJsonFile<SyncJob>(path.join(DATA_DIR, 'jobs', file));
    if (job) {
      jobs.push(job);
    }
  });
  
  return jobs;
}

export function getJobById(jobId: string): SyncJob | null {
  return readJsonFile<SyncJob>(getJobFilePath(jobId));
}

export function getJobsByDatabase(dbId: string): SyncJob[] {
  const jobs = getJobs();
  return jobs.filter(job => job.databaseId === dbId);
}

export function getJobsByDocument(docId: string): SyncJob[] {
  const jobs = getJobs();
  return jobs.filter(job => job.documentId === docId);
}

export function getEnabledJobs(): SyncJob[] {
  const jobs = getJobs();
  return jobs.filter(job => job.enabled);
}

export function saveJob(job: SyncJob): boolean {
  return writeJsonFile(getJobFilePath(job.id), job);
}

export function deleteJob(jobId: string): boolean {
  return deleteFile(getJobFilePath(jobId));
}

// 执行日志管理
export function getLogFilePath(logId: string): string {
  return path.join(DATA_DIR, 'logs', `${logId}.json`);
}

export function getLogsByJob(jobId: string, limit: number = 100) {
  const files = listFiles(path.join(DATA_DIR, 'logs'));
  const logs: any[] = [];
  
  files.forEach(file => {
    const log = readJsonFile(path.join(DATA_DIR, 'logs', file));
    if (log && log.jobId === jobId) {
      logs.push(log);
    }
  });
  
  // 按时间倒序排序
  logs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  
  return logs.slice(0, limit);
}

export function saveLog(log: any): boolean {
  return writeJsonFile(getLogFilePath(log.id), log);
}

// 配置历史管理
export function getHistoryFilePath(historyId: string): string {
  return path.join(DATA_DIR, 'history', `${historyId}.json`);
}

export function getHistoryByEntity(entityType: string, entityId: string, limit: number = 50) {
  const files = listFiles(path.join(DATA_DIR, 'history'));
  const history: ConfigHistory[] = [];
  
  files.forEach(file => {
    const record = readJsonFile<ConfigHistory>(path.join(DATA_DIR, 'history', file));
    if (record && record.entityType === entityType && record.entityId === entityId) {
      history.push(record);
    }
  });
  
  // 按时间倒序排序
  history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return history.slice(0, limit);
}

export function saveHistory(history: ConfigHistory): boolean {
  return writeJsonFile(getHistoryFilePath(history.id), history);
}

// 通知配置管理
export function getNotificationFilePath(userId: string): string {
  return path.join(DATA_DIR, 'notifications', `${userId}.json`);
}

export function getNotificationConfig(userId: string): NotificationConfig | null {
  return readJsonFile<NotificationConfig>(getNotificationFilePath(userId));
}

export function saveNotificationConfig(config: NotificationConfig): boolean {
  return writeJsonFile(getNotificationFilePath(config.userId), config);
}

// 模板管理
export function getTemplateFilePath(templateId: string): string {
  return path.join(DATA_DIR, 'templates', `${templateId}.json`);
}

export function getTemplates(): JobTemplate[] {
  const files = listFiles(path.join(DATA_DIR, 'templates'));
  const templates: JobTemplate[] = [];
  
  files.forEach(file => {
    const template = readJsonFile<JobTemplate>(path.join(DATA_DIR, 'templates', file));
    if (template) {
      templates.push(template);
    }
  });
  
  return templates;
}

export function getTemplateById(templateId: string): JobTemplate | null {
  return readJsonFile<JobTemplate>(getTemplateFilePath(templateId));
}

export function saveTemplate(template: JobTemplate): boolean {
  return writeJsonFile(getTemplateFilePath(template.id), template);
}

export function deleteTemplate(templateId: string): boolean {
  return deleteFile(getTemplateFilePath(templateId));
}

// 备份管理
export function createBackup(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(DATA_DIR, 'backups', `backup-${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // 备份所有数据目录
  const dirsToBackup = ['users', 'databases', 'documents', 'jobs', 'notifications', 'templates'];
  
  dirsToBackup.forEach(dir => {
    const sourceDir = path.join(DATA_DIR, dir);
    const targetDir = path.join(backupDir, dir);
    
    if (fs.existsSync(sourceDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      const files = fs.readdirSync(sourceDir);
      files.forEach(file => {
        fs.copyFileSync(
          path.join(sourceDir, file),
          path.join(targetDir, file)
        );
      });
    }
  });
  
  return backupDir;
}

export function listBackups(): string[] {
  const backupsDir = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(backupsDir)) {
    return [];
  }
  
  return fs.readdirSync(backupsDir)
    .filter(dir => dir.startsWith('backup-'))
    .sort((a, b) => b.localeCompare(a));
}

export function restoreBackup(backupName: string): boolean {
  try {
    const backupDir = path.join(DATA_DIR, 'backups', backupName);
    
    if (!fs.existsSync(backupDir)) {
      return false;
    }
    
    const dirsToRestore = ['users', 'databases', 'documents', 'jobs', 'notifications', 'templates'];
    
    dirsToRestore.forEach(dir => {
      const sourceDir = path.join(backupDir, dir);
      const targetDir = path.join(DATA_DIR, dir);
      
      if (fs.existsSync(sourceDir)) {
        // 清空目标目录
        if (fs.existsSync(targetDir)) {
          const files = fs.readdirSync(targetDir);
          files.forEach(file => {
            fs.unlinkSync(path.join(targetDir, file));
          });
        }
        
        // 复制备份文件
        const files = fs.readdirSync(sourceDir);
        files.forEach(file => {
          fs.copyFileSync(
            path.join(sourceDir, file),
            path.join(targetDir, file)
          );
        });
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error restoring backup:', error);
    return false;
  }
}

export function deleteBackup(backupName: string): boolean {
  try {
    const backupDir = path.join(DATA_DIR, 'backups', backupName);
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
      return true;
    }
  } catch (error) {
    console.error('Error deleting backup:', error);
  }
  return false;
}

// 初始化数据目录
ensureDataDir();
