import mysql from 'mysql2/promise';
import { ExecutionLog } from '@/types';
import { Logger } from '../utils/helpers';

interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionTimeout: number;
  queryTimeout: number;
}

export class MySQLLogStorage {
  private pool: mysql.Pool | null = null;
  private config: MySQLConfig;

  constructor(config: MySQLConfig) {
    this.config = config;
    // 不在这里调用initPool，而是在第一次使用时调用
    // 这样可以确保initPool方法完成后再使用MySQL存储
  }

  private async initPool() {
    try {
      // 首先尝试直接连接到目标数据库
      try {
        this.pool = mysql.createPool({
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          password: this.config.password,
          database: this.config.database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: this.config.connectionTimeout,
        });
        
        // 测试连接
        const connection = await this.pool.getConnection();
        connection.release();
      } catch (error) {
        // 如果目标数据库不存在，先连接到MySQL服务器（不指定数据库）
        const tempPool = mysql.createPool({
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          password: this.config.password,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: this.config.connectionTimeout,
        });
        
        const connection = await tempPool.getConnection();
        try {
          // 创建数据库
          await connection.query(`
            CREATE DATABASE IF NOT EXISTS ${this.config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
        } finally {
          connection.release();
          await tempPool.end();
        }
        
        // 现在连接到目标数据库
        this.pool = mysql.createPool({
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          password: this.config.password,
          database: this.config.database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: this.config.connectionTimeout,
        });
      }

      // 初始化数据库表结构
      await this.initializeDatabase();
      Logger.info('MySQL日志存储服务初始化成功');
    } catch (error) {
      Logger.error('MySQL日志存储服务初始化失败', { error: (error as Error).message });
      throw error;
    }
  }

  private async initializeDatabase() {
    if (!this.pool) {
      throw new Error('MySQL连接池未初始化');
    }

    try {
      const connection = await this.pool.getConnection();
      try {
        // 创建执行日志表
        await connection.query(`
          CREATE TABLE IF NOT EXISTS execution_logs (
            id VARCHAR(255) PRIMARY KEY,
            jobId VARCHAR(255) NOT NULL,
            status ENUM('running', 'success', 'failed') NOT NULL,
            startTime DATETIME NOT NULL,
            endTime DATETIME NULL,
            duration BIGINT NULL,
            recordsProcessed INT DEFAULT 0,
            recordsSucceeded INT DEFAULT 0,
            recordsFailed INT DEFAULT 0,
            retryAttempt INT DEFAULT 0,
            errorMessage TEXT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_jobId (jobId),
            INDEX idx_status (status),
            INDEX idx_startTime (startTime)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        Logger.info('MySQL数据库表结构初始化成功');
      } finally {
        connection.release();
      }
    } catch (error) {
      Logger.error('MySQL数据库初始化失败', { error: (error as Error).message });
      throw error;
    }
  }

  // 辅助函数：将ISO 8601格式的datetime字符串转换为MySQL支持的datetime格式
  private formatDateTime(isoString: string | undefined): string | null {
    if (!isoString) {
      return null;
    }
    try {
      const date = new Date(isoString);
      // 格式化为YYYY-MM-DD HH:MM:SS
      return date.toISOString().slice(0, 19).replace('T', ' ');
    } catch {
      return null;
    }
  }

  async saveLog(log: ExecutionLog): Promise<boolean> {
    // 直接使用mysql2的createConnection方法，不使用连接池
    try {
      const connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      });
      
      const query = `
        INSERT INTO execution_logs (
          id, jobId, status, startTime, endTime, duration, 
          recordsProcessed, recordsSucceeded, recordsFailed, 
          retryAttempt, errorMessage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // 格式化datetime值
      const formattedStartTime = this.formatDateTime(log.startTime);
      const formattedEndTime = this.formatDateTime(log.endTime);

      const values = [
        log.id,
        log.jobId,
        log.status,
        formattedStartTime,
        formattedEndTime,
        log.duration || null,
        log.recordsProcessed || 0,
        log.recordsSucceeded || 0,
        log.recordsFailed || 0,
        log.retryAttempt || 0,
        log.errorMessage || null
      ];

      await connection.execute(query, values);
      await connection.end();
      
      return true;
    } catch (error) {
      Logger.error('保存日志到MySQL失败', { error: (error as Error).message, logId: log.id });
      return false;
    }
  }

  async getJobLogs(jobId: string, limit: number = 100): Promise<ExecutionLog[]> {
    return this.getLogsByJob(jobId, limit);
  }

  async getLogsByJob(jobId: string, limit: number = 100): Promise<ExecutionLog[]> {
    // 直接使用mysql2的createConnection方法，不使用连接池
    try {
      const connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      });

      // 使用字符串插值构建SQL查询
      const safeLimit = parseInt(limit.toString(), 10);
      const sqlQuery = `
        SELECT * FROM execution_logs 
        WHERE jobId = '${jobId}' 
        ORDER BY startTime DESC 
        LIMIT ${safeLimit}
      `;

      const [rows] = await connection.query(sqlQuery);
      await connection.end();
      return rows as ExecutionLog[];
    } catch (error) {
      Logger.error('从MySQL获取日志失败', { error: (error as Error).message, jobId });
      throw error;
    }
  }

  async getLogById(logId: string): Promise<ExecutionLog | null> {
    if (!this.pool) {
      await this.initPool();
    }

    if (!this.pool) {
      throw new Error('MySQL连接池未初始化');
    }

    try {
      const query = `SELECT * FROM execution_logs WHERE id = ?`;
      const [rows] = await this.pool.execute(query, [logId]);
      const logs = rows as ExecutionLog[];
      return logs.length > 0 ? logs[0] : null;
    } catch (error) {
      Logger.error('从MySQL获取日志失败', { error: (error as Error).message, logId });
      return null;
    }
  }

  async getAllLogs(limit: number = 100): Promise<ExecutionLog[]> {
    // 直接使用mysql2的createConnection方法，不使用连接池
    try {
      const connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      });

      // 使用字符串插值构建SQL查询
      const safeLimit = parseInt(limit.toString(), 10);
      const sqlQuery = `
        SELECT * FROM execution_logs 
        ORDER BY startTime DESC 
        LIMIT ${safeLimit}
      `;

      const [rows] = await connection.query(sqlQuery);
      await connection.end();
      return rows as ExecutionLog[];
    } catch (error) {
      Logger.error('从MySQL获取所有日志失败', { error: (error as Error).message });
      return [];
    }
  }

  async deleteLog(logId: string): Promise<boolean> {
    if (!this.pool) {
      await this.initPool();
    }

    if (!this.pool) {
      throw new Error('MySQL连接池未初始化');
    }

    try {
      const query = `DELETE FROM execution_logs WHERE id = ?`;
      await this.pool.execute(query, [logId]);
      return true;
    } catch (error) {
      Logger.error('从MySQL删除日志失败', { error: (error as Error).message, logId });
      return false;
    }
  }

  async deleteJobLogs(jobId: string): Promise<boolean> {
    if (!this.pool) {
      await this.initPool();
    }

    if (!this.pool) {
      throw new Error('MySQL连接池未初始化');
    }

    try {
      const query = `DELETE FROM execution_logs WHERE jobId = ?`;
      await this.pool.execute(query, [jobId]);
      return true;
    } catch (error) {
      Logger.error('从MySQL删除作业日志失败', { error: (error as Error).message, jobId });
      return false;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      Logger.info('MySQL日志存储服务连接已关闭');
    }
  }

  // 检查MySQL连接是否正常
  async isConnected(): Promise<boolean> {
    if (!this.pool) {
      try {
        await this.initPool();
      } catch {
        return false;
      }
    }

    if (!this.pool) {
      return false;
    }

    try {
      const connection = await this.pool.getConnection();
      connection.release();
      return true;
    } catch {
      return false;
    }
  }
}

// 导出单例实例
let mysqlLogStorage: MySQLLogStorage | null = null;

export function getMySQLLogStorage(config: MySQLConfig): MySQLLogStorage {
  if (!mysqlLogStorage) {
    mysqlLogStorage = new MySQLLogStorage(config);
  }
  return mysqlLogStorage;
}

export function clearMySQLLogStorage() {
  if (mysqlLogStorage) {
    mysqlLogStorage.close();
    mysqlLogStorage = null;
  }
}
