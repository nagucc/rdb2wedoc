import mysql from 'mysql2/promise';
import { Pool as PostgresPool } from 'pg';
import { ConnectionPool as SqlServerPool } from 'mssql';
import oracledb from 'oracledb';
import { DatabaseConnection, DatabaseTable, DatabaseColumn, DatabaseType } from '@/types';
import { Logger } from '../utils/helpers';

export class DatabaseService {
  private connection: any = null;
  private pool: any = null;

  async connect(dbConfig: DatabaseConnection): Promise<boolean> {
    try {
      switch (dbConfig.type) {
        case 'mysql':
          await this.connectMySQL(dbConfig);
          break;
        case 'postgresql':
          await this.connectPostgreSQL(dbConfig);
          break;
        case 'sqlserver':
          await this.connectSQLServer(dbConfig);
          break;
        case 'oracle':
          await this.connectOracle(dbConfig);
          break;
        default:
          throw new Error(`不支持的数据库类型: ${dbConfig.type}`);
      }
      
      Logger.info(`成功连接到数据库: ${dbConfig.name}`);
      return true;
    } catch (error) {
      Logger.error(`连接数据库失败: ${dbConfig.name}`, { error: (error as Error).message });
      throw error;
    }
  }

  private async connectMySQL(config: DatabaseConnection): Promise<void> {
    const options = { ...config.options };
    
    if (options.connectionTimeout !== undefined) {
      options.connectTimeout = options.connectionTimeout * 1000;
      delete options.connectionTimeout;
    }
    
    if (options.maxConnections !== undefined) {
      options.connectionLimit = options.maxConnections;
      delete options.maxConnections;
    }
    
    if (options.timezone !== undefined) {
      const timezoneMap: Record<string, string> = {
        'UTC': '+00:00',
        'GMT': '+00:00',
        'EST': '-05:00',
        'CST': '-06:00',
        'MST': '-07:00',
        'PST': '-08:00',
        'CET': '+01:00',
        'EET': '+02:00',
        'JST': '+09:00',
        'KST': '+09:00',
        'CST_CHINA': '+08:00',
        'SGT': '+08:00'
      };
      options.timezone = timezoneMap[options.timezone] || options.timezone;
    }
    console.log('#######', config);
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ...options,
      charset: config.charset || 'latin1'
    });
    
    // 测试连接
    const connection = await this.pool.getConnection();
    connection.release();
  }

  private async connectPostgreSQL(config: DatabaseConnection): Promise<void> {
    const postgresConfig = {
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      max: 10,
      ...config.options
    };
    
    // PostgreSQL的字符集设置通过环境变量或连接字符串参数指定
    // 这里我们不设置options，因为它应该是一个字符串而不是对象
    
    this.pool = new PostgresPool(postgresConfig);
    
    // 测试连接
    await this.pool.query('SELECT NOW()');
  }

  private async connectSQLServer(config: DatabaseConnection): Promise<void> {
    const sqlServerConfig = {
      server: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
      options: {
        encrypt: true,
        trustServerCertificate: true,
        ...config.options
      }
    };
    
    // SQL Server的字符集设置通过连接字符串参数指定
    // 这里不添加charset属性，因为mssql库的options对象中没有这个属性
    
    this.pool = new SqlServerPool(sqlServerConfig);
    
    // 测试连接
    await this.pool.connect();
  }

  private async connectOracle(config: DatabaseConnection): Promise<void> {
    const oracleConfig = {
      user: config.username,
      password: config.password,
      connectString: `${config.host}:${config.port}/${config.database}`,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
      ...config.options
    };
    
    // Oracle字符集通常在数据库层面配置，连接时不需要特别设置
    
    this.pool = await oracledb.createPool(oracleConfig);
    
    // 测试连接
    const connection = await this.pool.getConnection();
    await connection.close();
  }

  async testConnection(dbConfig: DatabaseConnection): Promise<boolean> {
    try {
      await this.connect(dbConfig);
      await this.disconnect();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getTables(dbConfig: DatabaseConnection): Promise<DatabaseTable[]> {
    try {
      await this.connect(dbConfig);
      
      let tables: DatabaseTable[] = [];
      
      switch (dbConfig.type) {
        case 'mysql':
          tables = await this.getMySQLTables();
          break;
        case 'postgresql':
          tables = await this.getPostgreSQLTables();
          break;
        case 'sqlserver':
          tables = await this.getSQLServerTables();
          break;
        case 'oracle':
          tables = await this.getOracleTables();
          break;
      }
      
      return tables;
    } catch (error) {
      Logger.error('获取表列表失败', { error: (error as Error).message });
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  private async getMySQLTables(): Promise<DatabaseTable[]> {
    // 先获取表信息（包括注释）
    const [tableRows] = await this.pool.query(`
      SELECT TABLE_NAME, TABLE_COMMENT
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);
    
    // 再获取列信息
    const [columnRows] = await this.pool.query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);
    
    return this.processTableResultsWithComments(columnRows as any[], tableRows as any[]);
  }

  private async getPostgreSQLTables(): Promise<DatabaseTable[]> {
    // 先获取表信息（包括注释）
    const tableResult = await this.pool.query(`
      SELECT 
        t.table_name,
        pgtd.description as table_comment
      FROM information_schema.tables t
      LEFT JOIN pg_catalog.pg_statio_all_tables psat ON psat.schemaname = t.table_schema AND psat.relname = t.table_name
      LEFT JOIN pg_catalog.pg_description pgtd ON pgtd.objoid = psat.relid AND pgtd.objsubid = 0
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);
    
    // 再获取列信息
    const columnResult = await this.pool.query(`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        CASE WHEN pk.column_name IS NOT NULL THEN 'PRI' ELSE '' END as column_key,
        c.column_default,
        pgd.description as column_comment
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
      LEFT JOIN pg_catalog.pg_statio_all_tables psat ON psat.schemaname = t.table_schema AND psat.relname = t.table_name
      LEFT JOIN pg_catalog.pg_description pgd ON pgd.objoid = psat.relid AND pgd.objsubid = c.ordinal_position
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `);
    
    return this.processTableResultsWithComments(columnResult.rows, tableResult.rows);
  }

  private async getSQLServerTables(): Promise<DatabaseTable[]> {
    // 先获取表信息（包括注释）
    const tableResult = await this.pool.request().query(`
      SELECT 
        t.TABLE_NAME,
        ep.value as TABLE_COMMENT
      FROM INFORMATION_SCHEMA.TABLES t
      LEFT JOIN sys.extended_properties ep ON ep.major_id = OBJECT_ID(t.TABLE_SCHEMA + '.' + t.TABLE_NAME) 
        AND ep.minor_id = 0 AND ep.name = 'MS_Description'
      WHERE t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY t.TABLE_NAME
    `);
    
    // 再获取列信息
    const columnResult = await this.pool.request().query(`
      SELECT 
        t.TABLE_NAME,
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.IS_NULLABLE,
        CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'PRI' ELSE '' END as COLUMN_KEY,
        c.COLUMN_DEFAULT,
        ep.value as COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.TABLES t
      LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
      LEFT JOIN (
        SELECT ku.TABLE_NAME, ku.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
          ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
      LEFT JOIN sys.extended_properties ep ON ep.major_id = OBJECT_ID(t.TABLE_SCHEMA + '.' + t.TABLE_NAME) 
        AND ep.minor_id = c.ORDINAL_POSITION AND ep.name = 'MS_Description'
      WHERE t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
    `);
    
    return this.processTableResultsWithComments(columnResult.recordset, tableResult.recordset);
  }

  private async getOracleTables(): Promise<DatabaseTable[]> {
    const connection = await this.pool.getConnection();
    
    try {
      // 先获取表信息（包括注释）
      const tableResult = await connection.execute(`
        SELECT 
          t.TABLE_NAME,
          tc.COMMENTS as TABLE_COMMENT
        FROM USER_TABLES t
        LEFT JOIN USER_TAB_COMMENTS tc ON t.TABLE_NAME = tc.TABLE_NAME
        ORDER BY t.TABLE_NAME
      `);
      
      // 再获取列信息
      const columnResult = await connection.execute(`
        SELECT 
          t.TABLE_NAME,
          c.COLUMN_NAME,
          c.DATA_TYPE,
          c.NULLABLE,
          CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'PRI' ELSE '' END as COLUMN_KEY,
          c.DATA_DEFAULT,
          cc.COMMENTS as COLUMN_COMMENT
        FROM USER_TABLES t
        LEFT JOIN USER_TAB_COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
        LEFT JOIN (
          SELECT cc.TABLE_NAME, cc.COLUMN_NAME
          FROM USER_CONSTRAINTS cons
          JOIN USER_CONS_COLUMNS cc ON cons.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
          WHERE cons.CONSTRAINT_TYPE = 'P'
        ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
        LEFT JOIN USER_COL_COMMENTS cc ON c.TABLE_NAME = cc.TABLE_NAME AND c.COLUMN_NAME = cc.COLUMN_NAME
        ORDER BY t.TABLE_NAME, c.COLUMN_ID
      `);
      
      return this.processTableResultsWithComments(columnResult.rows as any[], tableResult.rows as any[]);
    } finally {
      await connection.close();
    }
  }

  private processTableResults(rows: any[]): DatabaseTable[] {
    const tableMap = new Map<string, DatabaseTable>();
    
    rows.forEach(row => {
      const tableName = row.TABLE_NAME || row.table_name;
      
      if (!tableMap.has(tableName)) {
        tableMap.set(tableName, {
          name: tableName,
          columns: []
        });
      }
      
      const table = tableMap.get(tableName)!;
      table.columns.push({
        name: row.COLUMN_NAME || row.column_name,
        type: row.DATA_TYPE || row.data_type,
        nullable: (row.IS_NULLABLE || row.nullable || 'NO') === 'YES',
        primaryKey: (row.COLUMN_KEY || row.column_key) === 'PRI',
        defaultValue: row.COLUMN_DEFAULT || row.column_default,
        comment: row.COLUMN_COMMENT || row.column_comment
      });
    });
    
    return Array.from(tableMap.values());
  }

  private processTableResultsWithComments(columns: any[], tables: any[]): DatabaseTable[] {
    const tableMap = new Map<string, DatabaseTable>();
    
    // 先创建表映射并添加注释
    tables.forEach(tableRow => {
      const tableName = tableRow.TABLE_NAME || tableRow.table_name;
      const tableComment = tableRow.TABLE_COMMENT || tableRow.table_comment;
      
      tableMap.set(tableName, {
        name: tableName,
        comment: tableComment,
        columns: []
      });
    });
    
    // 再添加列信息
    columns.forEach(columnRow => {
      const tableName = columnRow.TABLE_NAME || columnRow.table_name;
      
      if (!tableMap.has(tableName)) {
        tableMap.set(tableName, {
          name: tableName,
          columns: []
        });
      }
      
      const table = tableMap.get(tableName)!;
      table.columns.push({
        name: columnRow.COLUMN_NAME || columnRow.column_name,
        type: columnRow.DATA_TYPE || columnRow.data_type,
        nullable: (columnRow.IS_NULLABLE || columnRow.nullable || 'NO') === 'YES',
        primaryKey: (columnRow.COLUMN_KEY || columnRow.column_key) === 'PRI',
        defaultValue: columnRow.COLUMN_DEFAULT || columnRow.column_default,
        comment: columnRow.COLUMN_COMMENT || columnRow.column_comment
      });
    });
    
    return Array.from(tableMap.values());
  }

  async query(dbConfig: DatabaseConnection, sql: string, params?: any[]): Promise<any[]> {
    try {
      await this.connect(dbConfig);
      
      let results: any[] = [];
      
      switch (dbConfig.type) {
        case 'mysql':
          const [mysqlRows] = await this.pool.query(sql, params);
          results = mysqlRows as any[];
          break;
        case 'postgresql':
          const pgResult = await this.pool.query(sql, params);
          results = pgResult.rows;
          break;
        case 'sqlserver':
          const request = this.pool.request();
          if (params) {
            params.forEach((param, index) => {
              request.input(`param${index}`, param);
            });
          }
          const sqlResult = await request.query(sql);
          results = sqlResult.recordset;
          break;
        case 'oracle':
          const oracleConn = await this.pool.getConnection();
          try {
            const oracleResult = await oracleConn.execute(sql, params);
            results = oracleResult.rows as any[];
          } finally {
            await oracleConn.close();
          }
          break;
      }
      
      return results;
    } catch (error) {
      Logger.error('执行查询失败', { error: (error as Error).message, sql });
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        switch (this.pool.constructor.name) {
          case 'Pool':
            if (this.pool.end) {
              await this.pool.end();
            }
            break;
          case 'PostgresPool':
            await this.pool.end();
            break;
          case 'ConnectionPool':
            await this.pool.close();
            break;
          case 'Pool':
            if (this.pool.terminate) {
              await this.pool.terminate();
            }
            break;
        }
        this.pool = null;
      }
    } catch (error) {
      Logger.error('断开数据库连接失败', { error: (error as Error).message });
    }
  }
}

// 单例模式
export const databaseService = new DatabaseService();
