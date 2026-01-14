## app/api/auth/login/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { UserLogin } from '@/types';
import { getUserByUsername, saveHistory } from '@/lib/config/storage';
import { verifyPassword, generateId, Logger } from '@/lib/utils/helpers';
export const runtime = 'nodejs';
// 用户登录
export async function POST(request: NextRequest) {
  try {
    const body: UserLogin = await request.json();
    const { username, password } = body;
    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }
    // 查找用户
    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }
    // 验证密码
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }
    // 更新最后登录时间
    user.updatedAt = new Date().toISOString();
    // 注意：这里应该调用saveUser，但由于我们在getUserByUsername中已经脱敏了密码，
    // 实际应用中需要重新获取完整的用户信息
    Logger.info(`用户登录成功: ${username}`, { userId: user.id });
    // 返回用户信息（不包含密码）
    const { passwordHash: _, ...userWithoutPassword } = user;
    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: '登录成功'
    });
  } catch (error) {
    Logger.error('用户登录失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
```

## app/api/backup/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup.service';
import { Logger } from '@/lib/utils/helpers';
/**
 * POST /api/backup/[id]/restore
 * 恢复指定的备份
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    Logger.info('恢复备份请求', { backupId: id });
    const result = await backupService.restoreBackup(id);
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: result.message
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
        details: result.error
      }, { status: 500 });
    }
  } catch (error) {
    const { id } = await params;
    Logger.error('恢复备份失败', { 
      backupId: id,
      error: (error as Error).message 
    });
    return NextResponse.json({
      success: false,
      error: '恢复备份失败'
    }, { status: 500 });
  }
}
/**
 * DELETE /api/backup/[id]
 * 删除指定的备份
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    Logger.info('删除备份请求', { backupId: id });
    const success = await backupService.deleteBackup(id);
    if (success) {
      return NextResponse.json({
        success: true,
        data: {
          message: '备份删除成功'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '备份删除失败'
      }, { status: 500 });
    }
  } catch (error) {
    const { id } = await params;
    Logger.error('删除备份失败', { 
      backupId: id,
      error: (error as Error).message 
    });
    return NextResponse.json({
      success: false,
      error: '删除备份失败'
    }, { status: 500 });
  }
}
```

## app/api/backup/config/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup.service';
import { Logger } from '@/lib/utils/helpers';
/**
 * GET /api/backup/config
 * 获取备份配置
 */
export async function GET(request: NextRequest) {
  try {
    Logger.info('获取备份配置请求');
    const config = backupService.getConfig();
    // 脱敏处理
    const sanitizedConfig = {
      ...config,
      backupDir: config.backupDir // 可以选择是否隐藏完整路径
    };
    return NextResponse.json({
      success: true,
      data: sanitizedConfig
    });
  } catch (error) {
    Logger.error('获取备份配置失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '获取备份配置失败'
    }, { status: 500 });
  }
}
/**
 * PUT /api/backup/config
 * 更新备份配置
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { backupDir, maxBackups, autoBackup, backupInterval } = body;
    Logger.info('更新备份配置请求', { 
      backupDir, 
      maxBackups, 
      autoBackup, 
      backupInterval 
    });
    // 验证参数
    if (maxBackups !== undefined && (typeof maxBackups !== 'number' || maxBackups < 1)) {
      return NextResponse.json({
        success: false,
        error: 'maxBackups必须是大于0的数字'
      }, { status: 400 });
    }
    if (backupInterval !== undefined && (typeof backupInterval !== 'number' || backupInterval < 1)) {
      return NextResponse.json({
        success: false,
        error: 'backupInterval必须是大于0的数字'
      }, { status: 400 });
    }
    // 更新配置
    backupService.updateConfig({
      backupDir,
      maxBackups,
      autoBackup,
      backupInterval
    });
    // 如果自动备份配置发生变化，重启自动备份
    if (autoBackup !== undefined) {
      if (autoBackup) {
        backupService.startAutoBackup();
      } else {
        backupService.stopAutoBackup();
      }
    }
    const updatedConfig = backupService.getConfig();
    return NextResponse.json({
      success: true,
      data: {
        message: '备份配置更新成功',
        config: updatedConfig
      }
    });
  } catch (error) {
    Logger.error('更新备份配置失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '更新备份配置失败'
    }, { status: 500 });
  }
}
```

## app/api/backup/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup.service';
import { Logger } from '@/lib/utils/helpers';
/**
 * GET /api/backup
 * 获取所有备份列表
 */
export async function GET(request: NextRequest) {
  try {
    Logger.info('获取备份列表请求');
    const backups = await backupService.listBackups();
    const stats = await backupService.getBackupStats();
    return NextResponse.json({
      success: true,
      data: {
        backups,
        stats
      }
    });
  } catch (error) {
    Logger.error('获取备份列表失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '获取备份列表失败'
    }, { status: 500 });
  }
}
/**
 * POST /api/backup
 * 创建备份
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'full', description } = body;
    Logger.info('创建备份请求', { type, description });
    let result;
    if (type === 'full') {
      result = await backupService.createFullBackup(description);
    } else if (type === 'incremental') {
      result = await backupService.createIncrementalBackup(description);
    } else {
      return NextResponse.json({
        success: false,
        error: '不支持的备份类型'
      }, { status: 400 });
    }
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          backupId: result.backupId,
          filename: result.filename
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    Logger.error('创建备份失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '创建备份失败'
    }, { status: 500 });
  }
}
```

## app/api/dashboard/activity/route.ts

```typescript
import { NextResponse } from 'next/server';
import { getJobs, getJobLogs } from '@/lib/config/storage';
import { Logger } from '@/lib/utils/helpers';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const jobs = await getJobs();
    const days = 7;
    const activityData = new Array(days).fill(0);
    const now = new Date();
    const dayStartTimes: Date[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      dayStartTimes.push(date);
    }
    for (const job of jobs) {
      const logs = getJobLogs(job.id, 50);
      for (const log of logs) {
        if (log.status !== 'success') {
          continue;
        }
        const logTime = new Date(log.startTime);
        for (let i = 0; i < days; i++) {
          const dayStart = dayStartTimes[i];
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          if (logTime >= dayStart && logTime < dayEnd) {
            activityData[i] += log.recordsProcessed || 0;
            break;
          }
        }
      }
    }
    return NextResponse.json({
      success: true,
      data: {
        activityData,
        days: dayStartTimes.map(date => date.toISOString().split('T')[0])
      }
    });
  } catch (error) {
    Logger.error('获取活动数据失败', { error: (error as Error).message });
    return NextResponse.json(
      {
        success: false,
        error: '获取活动数据失败'
      },
      { status: 500 }
    );
  }
}
```

## app/api/dashboard/route.ts

```typescript
import { NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoring.service';
export async function GET() {
  try {
    const [systemMetrics, jobMetrics] = await Promise.all([
      monitoringService.getSystemMetrics(),
      monitoringService.getAllJobMetrics()
    ]);
    return NextResponse.json({
      success: true,
      data: {
        systemMetrics,
        jobMetrics
      }
    });
  } catch (error) {
    console.error('获取Dashboard数据失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取Dashboard数据失败'
      },
      { status: 500 }
    );
  }
}
```

## app/api/databases/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseById } from '@/lib/config/storage';
import { Logger } from '@/lib/utils/helpers';
// 获取单个数据源的完整信息（包括密码）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dbId } = await params;
    const db = getDatabaseById(dbId);
    if (!db) {
      Logger.warn(`数据源不存在: ${dbId}`);
      return NextResponse.json(
        { success: false, error: '数据源不存在' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: db
    });
  } catch (error) {
    Logger.error('获取数据源详情失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取数据源详情失败' },
      { status: 500 }
    );
  }
}
```

## app/api/databases/[id]/tables/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseById } from '@/lib/config/storage';
import { databaseService } from '@/lib/services/database.service';
import { Logger } from '@/lib/utils/helpers';
// 获取数据库的所有表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const database = await getDatabaseById(id);
    if (!database) {
      return NextResponse.json(
        { success: false, error: '数据源不存在' },
        { status: 404 }
      );
    }
    const tables = await databaseService.getTables(database);
    Logger.info(`获取数据库表列表成功: ${database.name}`, { dbId: database.id, tableCount: tables.length });
    return NextResponse.json({
      success: true,
      data: tables
    });
  } catch (error) {
    Logger.error('获取数据库表列表失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取表列表失败' },
      { status: 500 }
    );
  }
}
```

## app/api/databases/[id]/test/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseById } from '@/lib/config/storage';
import { databaseService } from '@/lib/services/database.service';
import { Logger } from '@/lib/utils/helpers';
// 测试数据库连接
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const database = await getDatabaseById(id);
    if (!database) {
      return NextResponse.json(
        { success: false, error: '数据源不存在' },
        { status: 404 }
      );
    }
    const isConnected = await databaseService.testConnection(database);
    if (isConnected) {
      Logger.info(`数据库连接测试成功: ${database.name}`, { dbId: database.id });
      return NextResponse.json({
        success: true,
        message: '连接成功'
      });
    } else {
      return NextResponse.json(
        { success: false, error: '连接失败' },
        { status: 400 }
      );
    }
  } catch (error) {
    Logger.error('测试数据库连接失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '连接测试失败' },
      { status: 500 }
    );
  }
}
```

## app/api/databases/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseConnection } from '@/types';
import { getDatabases, saveDatabase, saveHistory, deleteDatabase } from '@/lib/config/storage';
import { databaseService } from '@/lib/services/database.service';
import { generateId, validatePort, Logger } from '@/lib/utils/helpers';
// 获取所有数据源
export async function GET(request: NextRequest) {
  try {
    const databases = getDatabases();
    return NextResponse.json({
      success: true,
      data: databases
    });
  } catch (error) {
    Logger.error('获取数据源列表失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取数据源列表失败' },
      { status: 500 }
    );
  }
}
// 创建数据源
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, host, port, username, password, database, options } = body;
    // 验证必填字段
    if (!name || !type || !host || !port || !username || !password || !database) {
      return NextResponse.json(
        { success: false, error: '所有字段都必须填写' },
        { status: 400 }
      );
    }
    // 验证数据格式
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: '数据源名称长度必须在2-100个字符之间' },
        { status: 400 }
      );
    }
    if (!['mysql', 'postgresql', 'sqlserver', 'oracle'].includes(type)) {
      return NextResponse.json(
        { success: false, error: '不支持的数据库类型' },
        { status: 400 }
      );
    }
    // 验证端口
    validatePort(port);
    // 检查数据源名称是否已存在
    const existingDatabases = getDatabases();
    const isDuplicate = existingDatabases.some(db => 
      db.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (isDuplicate) {
      Logger.warn(`数据源名称已存在: ${name}`);
      return NextResponse.json(
        { success: false, error: '数据源名称已存在，请使用其他名称' },
        { status: 409 }
      );
    }
    // 测试连接
    const testConfig: DatabaseConnection = {
      id: generateId(),
      name: name.trim(),
      type,
      host: host.trim(),
      port,
      username: username.trim(),
      password,
      database: database.trim(),
      options,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const isConnected = await databaseService.testConnection(testConfig);
    if (!isConnected) {
      Logger.warn(`数据库连接测试失败: ${name}`, { host, port, database });
      return NextResponse.json(
        { success: false, error: '数据库连接失败，请检查配置信息' },
        { status: 400 }
      );
    }
    // 保存数据源配置
    await saveDatabase(testConfig);
    // 记录历史（不记录敏感信息）
    await saveHistory({
      id: generateId(),
      entityType: 'database',
      entityId: testConfig.id,
      action: 'create',
      newConfig: { 
        name: testConfig.name, 
        type: testConfig.type, 
        host: testConfig.host, 
        port: testConfig.port, 
        database: testConfig.database 
      },
      userId: 'system',
      timestamp: new Date().toISOString()
    });
    Logger.info(`数据源创建成功: ${name}`, { dbId: testConfig.id });
    // 返回数据源信息（脱敏密码）
    const { password: _, ...dbWithoutPassword } = testConfig;
    return NextResponse.json({
      success: true,
      data: dbWithoutPassword,
      message: '数据源创建成功'
    });
  } catch (error) {
    Logger.error('创建数据源失败', { error: (error as Error).message, stack: (error as Error).stack });
    return NextResponse.json(
      { success: false, error: '创建数据源失败，请稍后重试' },
      { status: 500 }
    );
  }
}
// 更新数据源
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, host, port, username, password, database, options } = body;
    // 验证必填字段
    if (!id || !name || !type || !host || !port || !username || !database) {
      return NextResponse.json(
        { success: false, error: '所有字段都必须填写' },
        { status: 400 }
      );
    }
    // 验证数据格式
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: '数据源名称长度必须在2-100个字符之间' },
        { status: 400 }
      );
    }
    if (!['mysql', 'postgresql', 'sqlserver', 'oracle'].includes(type)) {
      return NextResponse.json(
        { success: false, error: '不支持的数据库类型' },
        { status: 400 }
      );
    }
    // 验证端口
    validatePort(port);
    // 检查数据源是否存在
    const existingDatabases = getDatabases();
    const existingDb = existingDatabases.find(db => db.id === id);
    if (!existingDb) {
      Logger.warn(`数据源不存在: ${id}`);
      return NextResponse.json(
        { success: false, error: '数据源不存在' },
        { status: 404 }
      );
    }
    // 检查数据源名称是否与其他数据源重复
    const isDuplicate = existingDatabases.some(db => 
      db.id !== id && db.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (isDuplicate) {
      Logger.warn(`数据源名称已存在: ${name}`);
      return NextResponse.json(
        { success: false, error: '数据源名称已存在，请使用其他名称' },
        { status: 409 }
      );
    }
    // 保存数据源配置
    const updatedConfig: DatabaseConnection = {
      id,
      name: name.trim(),
      type,
      host: host.trim(),
      port,
      username: username.trim(),
      password: password,
      database: database.trim(),
      options,
      createdAt: existingDb.createdAt,
      updatedAt: new Date().toISOString()
    };
    await saveDatabase(updatedConfig);
    // 记录历史（不记录敏感信息）
    await saveHistory({
      id: generateId(),
      entityType: 'database',
      entityId: updatedConfig.id,
      action: 'update',
      oldConfig: { 
        name: existingDb.name, 
        type: existingDb.type, 
        host: existingDb.host, 
        port: existingDb.port, 
        database: existingDb.database 
      },
      newConfig: { 
        name: updatedConfig.name, 
        type: updatedConfig.type, 
        host: updatedConfig.host, 
        port: updatedConfig.port, 
        database: updatedConfig.database 
      },
      userId: 'system',
      timestamp: new Date().toISOString()
    });
    Logger.info(`数据源更新成功: ${name}`, { dbId: updatedConfig.id });
    // 返回数据源信息（脱敏密码）
    const { password: _, ...dbWithoutPassword } = updatedConfig;
    return NextResponse.json({
      success: true,
      data: dbWithoutPassword,
      message: '数据源更新成功'
    });
  } catch (error) {
    Logger.error('更新数据源失败', { error: (error as Error).message, stack: (error as Error).stack });
    return NextResponse.json(
      { success: false, error: '更新数据源失败，请稍后重试' },
      { status: 500 }
    );
  }
}
// 删除数据源
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少数据源ID' },
        { status: 400 }
      );
    }
    // 检查数据源是否存在
    const existingDatabases = getDatabases();
    const existingDb = existingDatabases.find(db => db.id === id);
    if (!existingDb) {
      Logger.warn(`数据源不存在: ${id}`);
      return NextResponse.json(
        { success: false, error: '数据源不存在' },
        { status: 404 }
      );
    }
    // 删除数据源
    await deleteDatabase(id);
    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'database',
      entityId: id,
      action: 'delete',
      oldConfig: { 
        name: existingDb.name, 
        type: existingDb.type, 
        host: existingDb.host, 
        port: existingDb.port, 
        database: existingDb.database 
      },
      userId: 'system',
      timestamp: new Date().toISOString()
    });
    Logger.info(`数据源删除成功: ${existingDb.name}`, { dbId: id });
    return NextResponse.json({
      success: true,
      message: '数据源删除成功'
    });
  } catch (error) {
    Logger.error('删除数据源失败', { error: (error as Error).message, stack: (error as Error).stack });
    return NextResponse.json(
      { success: false, error: '删除数据源失败，请稍后重试' },
      { status: 500 }
    );
  }
}
```

## app/api/databases/test/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseConnection } from '@/types';
import { databaseService } from '@/lib/services/database.service';
import { Logger } from '@/lib/utils/helpers';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, host, port, username, password, database, options } = body;
    // 验证必填字段
    if (!name || !type || !host || !port || !username || !password || !database) {
      return NextResponse.json(
        { success: false, error: '所有字段都必须填写' },
        { status: 400 }
      );
    }
    // 验证数据类型
    if (typeof name !== 'string' || typeof host !== 'string' || 
        typeof username !== 'string' || typeof password !== 'string' || 
        typeof database !== 'string') {
      return NextResponse.json(
        { success: false, error: '字段类型不正确' },
        { status: 400 }
      );
    }
    // 验证数据库类型
    if (!['mysql', 'postgresql', 'sqlserver', 'oracle'].includes(type)) {
      return NextResponse.json(
        { success: false, error: '不支持的数据库类型' },
        { status: 400 }
      );
    }
    // 验证端口
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return NextResponse.json(
        { success: false, error: '端口号必须在1-65535之间' },
        { status: 400 }
      );
    }
    const testConfig: DatabaseConnection = {
      id: 'test',
      name: name.trim(),
      type,
      host: host.trim(),
      port: portNum,
      username: username.trim(),
      password,
      database: database.trim(),
      options,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    Logger.info(`开始测试数据库连接: ${testConfig.name}`, { 
      host: testConfig.host, 
      port: testConfig.port,
      database: testConfig.database 
    });
    const isConnected = await databaseService.testConnection(testConfig);
    if (isConnected) {
      Logger.info(`数据库连接测试成功: ${testConfig.name}`);
      return NextResponse.json({
        success: true,
        message: '连接成功'
      });
    } else {
      Logger.warn(`数据库连接测试失败: ${testConfig.name}`, { 
        host: testConfig.host, 
        port: testConfig.port,
        database: testConfig.database 
      });
      return NextResponse.json(
        { success: false, error: '连接失败，请检查配置信息' },
        { status: 400 }
      );
    }
  } catch (error) {
    Logger.error('测试数据库连接失败', { 
      error: (error as Error).message,
      stack: (error as Error).stack 
    });
    return NextResponse.json(
      { success: false, error: '连接测试失败，请稍后重试' },
      { status: 500 }
    );
  }
}
```

## app/api/datasources/route.ts

```typescript
import { NextResponse } from 'next/server';
import { dataSourceService } from '@/lib/services/datasource.service';
import { getDatabases } from '@/lib/config/storage';
export async function GET() {
  try {
    const connections = getDatabases();
    const allMetrics = await Promise.all(
      connections.map(async (conn) => {
        return await dataSourceService.getDataSourceMetrics(conn.id);
      })
    );
    const stats = await dataSourceService.getDataSourceStats();
    return NextResponse.json({
      success: true,
      data: {
        metrics: allMetrics,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching data source metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data source metrics'
      },
      { status: 500 }
    );
  }
}
```

## app/api/datatargets/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils/helpers';
import { getDocuments, getDocumentSheets, getWeComAccountById } from '@/lib/config/storage';
interface DataTargetMetrics {
  totalWeComAccounts: number;
  activeWeComAccounts: number;
  totalDocuments: number;
  activeDocuments: number;
  totalSheets: number;
  totalFields: number;
  lastSyncTime: string;
  syncSuccessRate: number;
}
export async function GET(request: NextRequest) {
  try {
    const documents = getDocuments();
    let totalSheets = 0;
    let totalFields = 0;
    let activeDocuments = 0;
    for (const doc of documents) {
      try {
        const sheets = getDocumentSheets(doc.id);
        if (sheets) {
          totalSheets += sheets.length;
          for (const sheet of sheets) {
            totalFields += sheet.fields.length;
          }
        }
        const account = getWeComAccountById(doc.accountId);
        if (account && account.enabled) {
          activeDocuments++;
        }
      } catch (error) {
        Logger.warn(`获取文档 ${doc.id} 的工作表失败`, { error: (error as Error).message });
      }
    }
    const metrics: DataTargetMetrics = {
      totalWeComAccounts: 1,
      activeWeComAccounts: 1,
      totalDocuments: documents.length,
      activeDocuments,
      totalSheets,
      totalFields,
      lastSyncTime: new Date().toISOString(),
      syncSuccessRate: 95.5
    };
    Logger.info('数据目标统计获取成功', metrics);
    return NextResponse.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    Logger.error('获取数据目标统计失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取数据目标统计失败' },
      { status: 500 }
    );
  }
}
```

## app/api/documents/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WeComDocument } from '@/types';
import { getDocumentById, deleteDocument, saveDocument, saveHistory } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { generateId, Logger } from '@/lib/utils/helpers';
// 获取单个企业微信文档
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: document
    });
  } catch (error) {
    Logger.error('获取企业微信文档信息失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取文档信息失败' },
      { status: 500 }
    );
  }
}
// 更新企业微信文档
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }
    const body = await request.json();
    const { name, documentId } = body;
    // 记录旧配置
    const oldConfig = { name: document.name, documentId: document.id };
    // 更新字段
    if (name) document.name = name;
    if (documentId) document.id = documentId;
    document.updatedAt = new Date().toISOString();
    // 测试连接
    const isConnected = await weComDocumentService.testConnection(document);
    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: '企业微信文档连接失败，请检查配置' },
        { status: 400 }
      );
    }
    await saveDocument(document);
    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'document',
      entityId: document.id,
      action: 'update',
      oldConfig,
      newConfig: { name: document.name, documentId: document.id },
      userId: 'system',
      timestamp: new Date().toISOString()
    });
    Logger.info(`企业微信文档更新成功: ${document.name}`, { docId: document.id });
    return NextResponse.json({
      success: true,
      data: document,
      message: '更新成功'
    });
  } catch (error) {
    Logger.error('更新企业微信文档失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新文档失败' },
      { status: 500 }
    );
  }
}
// 删除企业微信文档
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }
    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'document',
      entityId: document.id,
      action: 'delete',
      oldConfig: { name: document.name, documentId: document.id },
      userId: 'system',
      timestamp: new Date().toISOString()
    });
    await deleteDocument(id);
    Logger.info(`企业微信文档删除成功: ${document.name}`, { docId: document.id });
    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    Logger.error('删除企业微信文档失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除文档失败' },
      { status: 500 }
    );
  }
}
```

## app/api/documents/[id]/sheets/[sheetId]/fields/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, getWeComAccountById } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { Logger } from '@/lib/utils/helpers';
// 获取Sheet的字段信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  try {
    const { id, sheetId } = await params;
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }
    const account = getWeComAccountById(document.accountId);
    if (!account) {
      return NextResponse.json(
        { success: false, error: '关联的企业微信账号不存在' },
        { status: 404 }
      );
    }
    const accessToken = await weComDocumentService.getAccessToken(account.corpId, account.corpSecret);
    const fields = await weComDocumentService.getSheetFields(accessToken, document.id, sheetId);
    Logger.info(`获取企业微信文档Sheet字段成功: ${document.name}`, { 
      docId: document.id, 
      sheetId: sheetId,
      fieldCount: fields.length 
    });
    return NextResponse.json({
      success: true,
      data: fields
    });
  } catch (error) {
    Logger.error('获取企业微信文档Sheet字段失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取字段信息失败' },
      { status: 500 }
    );
  }
}
```

## app/api/documents/[id]/sheets/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, getIntelligentDocumentById, getWeComAccountById } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { Logger } from '@/lib/utils/helpers';
interface WecomSmartSheet {
  id: string;
  name: string;
  status: string;
  sheetCount: number;
  createdAt: string;
  accountId: string;
  lastSyncTime?: string;
  sheets: Array<{
    id: string;
    name: string;
    fields: any[];
  }>;
}
interface DocumentSheet {
  sheet_id: string;
  title: string;
}
// 获取文档的所有Sheet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    Logger.info(`开始获取文档Sheet列表`, { docId: id });
    // 先尝试获取智能表格
    const intelligentDoc = getIntelligentDocumentById(id) as WecomSmartSheet | null;
    if (intelligentDoc) {
      Logger.info(`找到智能表格，直接返回缓存的Sheet列表`, { 
        docId: id, 
        docName: intelligentDoc.name,
        sheetCount: intelligentDoc.sheets.length 
      });
      const sheets = intelligentDoc.sheets.map(sheet => ({
        id: sheet.id,
        sheet_id: sheet.id,
        name: sheet.name,
        title: sheet.name,
        fields: sheet.fields || []
      }));
      return NextResponse.json({
        success: true,
        data: sheets
      });
    }
    // 如果不是智能表格，尝试获取普通文档
    const document = await getDocumentById(id);
    if (!document) {
      Logger.warn(`文档不存在`, { docId: id });
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }
    Logger.info(`找到普通文档，调用企业微信API获取Sheet列表`, { 
      docId: id, 
      docName: document.name 
    });
    const account = getWeComAccountById(document.accountId);
    if (!account) {
      Logger.warn(`关联的企业微信账号不存在`, { docId: id, accountId: document.accountId });
      return NextResponse.json(
        { success: false, error: '关联的企业微信账号不存在' },
        { status: 404 }
      );
    }
    const accessToken = await weComDocumentService.getAccessToken(account.corpId, account.corpSecret);
    const sheets = await weComDocumentService.getDocumentSheets(accessToken, document.id);
    const formattedSheets = sheets.map(sheet => ({
      id: sheet.id,
      sheet_id: sheet.id,
      name: sheet.name,
      title: sheet.name,
      fields: sheet.fields || []
    }));
    Logger.info(`获取企业微信文档Sheet列表成功: ${document.name}`, { 
      docId: document.id, 
      sheetCount: formattedSheets.length 
    });
    return NextResponse.json({
      success: true,
      data: formattedSheets
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    Logger.error('获取文档Sheet列表失败', { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { success: false, error: `获取Sheet列表失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}
```

## app/api/documents/[id]/test/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { Logger } from '@/lib/utils/helpers';
// 测试企业微信文档连接
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }
    const isConnected = await weComDocumentService.testConnection(document);
    if (isConnected) {
      Logger.info(`企业微信文档连接测试成功: ${document.name}`, { docId: document.id });
      return NextResponse.json({
        success: true,
        message: '连接成功'
      });
    } else {
      return NextResponse.json(
        { success: false, error: '连接失败，请检查配置' },
        { status: 400 }
      );
    }
  } catch (error) {
    Logger.error('测试企业微信文档连接失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '测试连接失败' },
      { status: 500 }
    );
  }
}
```

## app/api/documents/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WeComDocument } from '@/types';
import { getDocuments, saveDocument, saveHistory } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { generateId, Logger } from '@/lib/utils/helpers';
// 获取所有企业微信文档
export async function GET(request: NextRequest) {
  try {
    const documents = getDocuments();
    return NextResponse.json({
      success: true,
      data: documents
    });
  } catch (error) {
    Logger.error('获取企业微信文档列表失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取文档列表失败' },
      { status: 500 }
    );
  }
}
// 创建企业微信文档连接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, documentId, accountId } = body;
    // 验证必填字段
    if (!name || !documentId || !accountId) {
      return NextResponse.json(
        { success: false, error: '所有字段都必须填写' },
        { status: 400 }
      );
    }
    // 创建文档配置
    const document: WeComDocument = {
      id: documentId,
      name,
      accountId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    // 测试连接
    const isConnected = await weComDocumentService.testConnection(document);
    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: '企业微信文档连接失败，请检查配置' },
        { status: 400 }
      );
    }
    // 保存文档配置
    await saveDocument(document);
    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'document',
      entityId: document.id,
      action: 'create',
      newConfig: { name, documentId },
      userId: 'system',
      timestamp: new Date().toISOString()
    });
    Logger.info(`企业微信文档创建成功: ${name}`, { docId: document.id });
    return NextResponse.json({
      success: true,
      data: document,
      message: '文档连接成功'
    });
  } catch (error) {
    Logger.error('创建企业微信文档连接失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '创建文档连接失败' },
      { status: 500 }
    );
  }
}
```

## app/api/errors/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { errorHandlerService } from '@/lib/services/error-handler.service';
import { Logger } from '@/lib/utils/helpers';
/**
 * GET /api/errors/[id]
 * 获取指定ID的错误详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    Logger.info('获取错误详情请求', { errorId: id });
    const errorLog = errorHandlerService.getErrorById(id);
    if (!errorLog) {
      return NextResponse.json({
        success: false,
        error: '错误不存在'
      }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: {
        errorLog
      }
    });
  } catch (error) {
    Logger.error('获取错误详情失败', { 
      errorId: id,
      error: (error as Error).message 
    });
    return NextResponse.json({
      success: false,
      error: '获取错误详情失败'
    }, { status: 500 });
  }
}
/**
 * PUT /api/errors/[id]/resolve
 * 标记错误为已解决
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { resolvedBy, note } = body;
    Logger.info('标记错误为已解决请求', { errorId: id, resolvedBy });
    if (!resolvedBy) {
      return NextResponse.json({
        success: false,
        error: 'resolvedBy参数是必需的'
      }, { status: 400 });
    }
    const success = errorHandlerService.resolveError(id, resolvedBy, note);
    if (success) {
      return NextResponse.json({
        success: true,
        data: {
          message: '错误已标记为解决'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '错误不存在或标记失败'
      }, { status: 404 });
    }
  } catch (error) {
    Logger.error('标记错误为已解决失败', { 
      errorId: id,
      error: (error as Error).message 
    });
    return NextResponse.json({
      success: false,
      error: '标记错误为已解决失败'
    }, { status: 500 });
  }
}
```

## app/api/errors/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { errorHandlerService } from '@/lib/services/error-handler.service';
import { Logger } from '@/lib/utils/helpers';
/**
 * GET /api/errors
 * 获取错误日志列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = {
      level: searchParams.get('level') as 'error' | 'warning' | 'info' | undefined,
      category: searchParams.get('category') || undefined,
      resolved: searchParams.get('resolved') === 'true' ? true : 
                searchParams.get('resolved') === 'false' ? false : 
                undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    };
    Logger.info('获取错误日志请求', { filter });
    const logs = errorHandlerService.getErrorLogs(filter);
    return NextResponse.json({
      success: true,
      data: {
        logs,
        total: logs.length
      }
    });
  } catch (error) {
    Logger.error('获取错误日志失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '获取错误日志失败'
    }, { status: 500 });
  }
}
/**
 * POST /api/errors
 * 手动记录错误
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      message, 
      level = 'error', 
      category = 'other',
      stack,
      context,
      userId 
    } = body;
    Logger.info('手动记录错误请求', { message, level, category });
    if (!message) {
      return NextResponse.json({
        success: false,
        error: 'message参数是必需的'
      }, { status: 400 });
    }
    // 创建Error对象
    const error = new Error(message);
    if (stack) {
      error.stack = stack;
    }
    const errorLog = errorHandlerService.logError(error, {
      level,
      category,
      context,
      userId
    });
    return NextResponse.json({
      success: true,
      data: {
        errorLog
      }
    });
  } catch (error) {
    Logger.error('记录错误失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '记录错误失败'
    }, { status: 500 });
  }
}
```

## app/api/errors/stats/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { errorHandlerService } from '@/lib/services/error-handler.service';
import { Logger } from '@/lib/utils/helpers';
/**
 * GET /api/errors/stats
 * 获取错误统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    Logger.info('获取错误统计请求', { days });
    const stats = errorHandlerService.getErrorStats();
    const trend = errorHandlerService.getErrorTrend(days);
    return NextResponse.json({
      success: true,
      data: {
        stats,
        trend
      }
    });
  } catch (error) {
    Logger.error('获取错误统计失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '获取错误统计失败'
    }, { status: 500 });
  }
}
/**
 * POST /api/errors/batch-resolve
 * 批量解决错误
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, resolvedBy, note } = body;
    Logger.info('批量解决错误请求', { category, resolvedBy });
    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'category参数是必需的'
      }, { status: 400 });
    }
    if (!resolvedBy) {
      return NextResponse.json({
        success: false,
        error: 'resolvedBy参数是必需的'
      }, { status: 400 });
    }
    const count = errorHandlerService.resolveErrorsByCategory(
      category,
      resolvedBy,
      note
    );
    return NextResponse.json({
      success: true,
      data: {
        message: `已解决${count}个错误`,
        count
      }
    });
  } catch (error) {
    Logger.error('批量解决错误失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '批量解决错误失败'
    }, { status: 500 });
  }
}
/**
 * DELETE /api/errors/clear
 * 清除错误日志
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'resolved';
    Logger.info('清除错误日志请求', { type });
    let count = 0;
    if (type === 'resolved') {
      count = errorHandlerService.clearResolvedErrors();
    } else if (type === 'all') {
      errorHandlerService.clearAllErrors();
    } else {
      return NextResponse.json({
        success: false,
        error: '不支持的清除类型，必须是resolved或all'
      }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      data: {
        message: type === 'all' ? '已清除所有错误日志' : `已清除${count}个已解决的错误`,
        count
      }
    });
  } catch (error) {
    Logger.error('清除错误日志失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '清除错误日志失败'
    }, { status: 500 });
  }
}
```

## app/api/field-mapping/database-fields/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { fieldMappingService } from '@/lib/services/field-mapping.service';
import { Logger } from '@/lib/utils/helpers';
// 获取数据库表的字段信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const databaseId = searchParams.get('databaseId');
    const tableName = searchParams.get('tableName');
    if (!databaseId || !tableName) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    const fields = await fieldMappingService.getDatabaseFields(databaseId, tableName);
    return NextResponse.json({
      success: true,
      data: fields
    });
  } catch (error) {
    Logger.error('获取数据库字段失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取字段失败' },
      { status: 500 }
    );
  }
}
```

## app/api/field-mapping/document-fields/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { fieldMappingService } from '@/lib/services/field-mapping.service';
import { Logger } from '@/lib/utils/helpers';
// 获取企业微信文档Sheet的字段信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const sheetId = searchParams.get('sheetId');
    if (!documentId || !sheetId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    const fields = await fieldMappingService.getDocumentFields(documentId, sheetId);
    return NextResponse.json({
      success: true,
      data: fields
    });
  } catch (error) {
    Logger.error('获取文档字段失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取字段失败' },
      { status: 500 }
    );
  }
}
```

## app/api/field-mapping/preview/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { fieldMappingService } from '@/lib/services/field-mapping.service';
import { Logger } from '@/lib/utils/helpers';
// 获取映射预览
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { databaseId, documentId, tableName, sheetId, mappings, limit } = body;
    if (!databaseId || !documentId || !tableName || !sheetId || !mappings) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    // 获取映射预览
    const preview = await fieldMappingService.getMappingPreview(
      databaseId,
      documentId,
      tableName,
      sheetId,
      mappings,
      limit || 10
    );
    return NextResponse.json({
      success: true,
      data: preview
    });
  } catch (error) {
    Logger.error('获取映射预览失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取预览失败' },
      { status: 500 }
    );
  }
}
```

## app/api/field-mapping/validate/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { fieldMappingService } from '@/lib/services/field-mapping.service';
import { Logger } from '@/lib/utils/helpers';
// 验证字段映射配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { databaseId, documentId, tableName, sheetId, mappings } = body;
    if (!databaseId || !documentId || !tableName || !sheetId || !mappings) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    // 获取数据库字段
    const databaseFields = await fieldMappingService.getDatabaseFields(
      databaseId,
      tableName
    );
    // 获取文档字段
    const documentFields = await fieldMappingService.getDocumentFields(
      documentId,
      sheetId
    );
    // 验证映射
    const validation = fieldMappingService.validateFieldMappings(
      mappings,
      databaseFields,
      documentFields
    );
    return NextResponse.json({
      success: true,
      data: validation
    });
  } catch (error) {
    Logger.error('验证字段映射失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '验证失败' },
      { status: 500 }
    );
  }
}
```

## app/api/jobs/[id]/execute/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { syncService } from '@/lib/services/sync.service';
import { Logger } from '@/lib/utils/helpers';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: '作业ID不能为空' },
        { status: 400 }
      );
    }
    Logger.info(`开始执行同步作业: ${id}`);
    const executionLog = await syncService.executeJob(id);
    if (executionLog.status === 'success') {
      Logger.info(`同步作业执行成功: ${id}`);
      return NextResponse.json({
        success: true,
        message: '作业执行成功',
        data: executionLog
      });
    } else {
      Logger.warn(`同步作业执行失败: ${id}`, { error: executionLog.errorMessage });
      return NextResponse.json(
        { 
          success: false, 
          error: executionLog.errorMessage || '作业执行失败',
          data: executionLog
        },
        { status: 500 }
      );
    }
  } catch (error) {
    Logger.error('执行同步作业失败', { 
      error: (error as Error).message, 
      stack: (error as Error).stack 
    });
    return NextResponse.json(
      { success: false, error: (error as Error).message || '执行作业失败，请稍后重试' },
      { status: 500 }
    );
  }
}
```

## app/api/jobs/[id]/logs/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getJobById, getJobLogs, saveJobLog } from '@/lib/config/storage';
import { syncService } from '@/lib/services/sync.service';
import { generateId, Logger } from '@/lib/utils/helpers';
// 获取同步作业的执行日志
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }
    const logs = getJobLogs(id);
    return NextResponse.json({
      success: true,
      data: logs
    });
  } catch (error) {
    Logger.error('获取同步作业日志失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取日志失败' },
      { status: 500 }
    );
  }
}
// 手动执行同步作业
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }
    // 创建执行日志
    const logId = generateId();
    const startTime = new Date();
    try {
      // 执行同步作业
      await syncService.executeJob(job.id);
      // 记录成功日志
      await saveJobLog({
        id: logId,
        jobId: job.id,
        status: 'success',
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        recordsProcessed: 0,
        errorMessage: null
      });
      Logger.info(`同步作业手动执行成功: ${job.name}`, { jobId: job.id, logId });
      return NextResponse.json({
        success: true,
        message: '同步执行成功',
        logId
      });
    } catch (error) {
      // 记录失败日志
      await saveJobLog({
        id: logId,
        jobId: job.id,
        status: 'failed',
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        recordsProcessed: 0,
        errorMessage: (error as Error).message
      });
      Logger.error(`同步作业手动执行失败: ${job.name}`, { 
        jobId: job.id, 
        logId, 
        error: (error as Error).message 
      });
      return NextResponse.json(
        { success: false, error: '同步执行失败', logId },
        { status: 500 }
      );
    }
  } catch (error) {
    Logger.error('执行同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '执行作业失败' },
      { status: 500 }
    );
  }
}
```

## app/api/jobs/[id]/preview/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getJobById } from '@/lib/config/storage';
import { syncService } from '@/lib/services/sync.service';
import { Logger } from '@/lib/utils/helpers';
// 预览同步作业数据
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }
    // 获取预览数据
    const previewData = await syncService.previewData(job);
    Logger.info(`同步作业预览成功: ${job.name}`, { 
      jobId: job.id, 
      recordCount: previewData.length 
    });
    return NextResponse.json({
      success: true,
      data: previewData,
      message: '预览成功'
    });
  } catch (error) {
    Logger.error('预览同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '预览失败' },
      { status: 500 }
    );
  }
}
```

## app/api/jobs/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getJobById, updateJob, deleteJob, saveHistory } from '@/lib/config/storage';
import { generateId, validateCronExpression, Logger } from '@/lib/utils/helpers';
// 获取单个同步作业
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: job
    });
  } catch (error) {
    Logger.error('获取同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取作业失败' },
      { status: 500 }
    );
  }
}
// 更新同步作业
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingJob = await getJobById(id);
    if (!existingJob) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }
    const body = await request.json();
    const { 
      name, 
      mappingConfigId,
      schedule,
      conflictStrategy,
      enabled 
    } = body;
    // 验证必填字段
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { success: false, error: '作业名称不能为空' },
        { status: 400 }
      );
    }
    if (mappingConfigId !== undefined && (typeof mappingConfigId !== 'string' || mappingConfigId.trim() === '')) {
      return NextResponse.json(
        { success: false, error: '请选择数据映射配置' },
        { status: 400 }
      );
    }
    // 验证Cron表达式
    if (schedule && !validateCronExpression(schedule)) {
      return NextResponse.json(
        { success: false, error: 'Cron表达式格式不正确' },
        { status: 400 }
      );
    }
    // 更新作业配置
    const updatedJob = {
      ...existingJob,
      name: name || existingJob.name,
      mappingConfigId: mappingConfigId || existingJob.mappingConfigId,
      schedule: schedule || existingJob.schedule,
      conflictStrategy: conflictStrategy || existingJob.conflictStrategy,
      enabled: enabled !== undefined ? enabled : existingJob.enabled,
      updatedAt: new Date().toISOString()
    };
    await updateJob(updatedJob);
    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'job',
      entityId: updatedJob.id,
      action: 'update',
      oldConfig: { name: existingJob.name },
      newConfig: { name: updatedJob.name },
      userId: 'system',
      timestamp: new Date().toISOString()
    });
    Logger.info(`同步作业更新成功: ${updatedJob.name}`, { jobId: updatedJob.id });
    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: '作业更新成功'
    });
  } catch (error) {
    Logger.error('更新同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新作业失败' },
      { status: 500 }
    );
  }
}
// 删除同步作业
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }
    await deleteJob(id);
    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'job',
      entityId: job.id,
      action: 'delete',
      oldConfig: { name: job.name },
      userId: 'system',
      timestamp: new Date().toISOString()
    });
    Logger.info(`同步作业删除成功: ${job.name}`, { jobId: job.id });
    return NextResponse.json({
      success: true,
      message: '作业删除成功'
    });
  } catch (error) {
    Logger.error('删除同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除作业失败' },
      { status: 500 }
    );
  }
}
// 启动同步作业
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }
    const updatedJob = {
      ...job,
      enabled: true,
      updatedAt: new Date().toISOString()
    };
    await updateJob(updatedJob);
    Logger.info(`同步作业启动成功: ${job.name}`, { jobId: job.id });
    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: '作业启动成功'
    });
  } catch (error) {
    Logger.error('启动同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '启动作业失败' },
      { status: 500 }
    );
  }
}
// 停止同步作业
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }
    const updatedJob = {
      ...job,
      enabled: false,
      updatedAt: new Date().toISOString()
    };
    await updateJob(updatedJob);
    Logger.info(`同步作业停止成功: ${job.name}`, { jobId: job.id });
    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: '作业停止成功'
    });
  } catch (error) {
    Logger.error('停止同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '停止作业失败' },
      { status: 500 }
    );
  }
}
```

## app/api/jobs/execution-logs/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { listFiles, readJsonFile } from '@/lib/config/storage';
import path from 'path';
import { ExecutionLog } from '@/types';
const DATA_DIR = path.join(process.cwd(), 'data');
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const files = listFiles(path.join(DATA_DIR, 'logs'));
    const logs: ExecutionLog[] = [];
    files.forEach(file => {
      try {
        const log = readJsonFile<ExecutionLog>(path.join(DATA_DIR, 'logs', file));
        if (log) {
          if (log.status === 'running' && !log.duration) {
            log.duration = new Date().getTime() - new Date(log.startTime).getTime();
          }
          logs.push(log);
        }
      } catch (error) {
        console.error(`解析日志文件失败: ${file}`, error);
      }
    });
    logs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return NextResponse.json({
      success: true,
      data: logs.slice(0, limit)
    });
  } catch (error) {
    console.error('获取作业执行日志失败:', error);
    return NextResponse.json(
      { success: false, error: '获取日志失败' },
      { status: 500 }
    );
  }
}
```

## app/api/jobs/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SyncJob } from '@/types';
import { getJobs, getJobById, saveJob, deleteJob, saveHistory } from '@/lib/config/storage';
import { generateId, validateCronExpression, Logger } from '@/lib/utils/helpers';
// 获取所有同步作业
export async function GET(request: NextRequest) {
  try {
    const jobs = getJobs();
    return NextResponse.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    Logger.error('获取同步作业列表失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取作业列表失败' },
      { status: 500 }
    );
  }
}
// 创建同步作业
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      mappingConfigId,
      schedule,
      conflictStrategy,
      syncMode,
      enabled 
    } = body;
    // 验证必填字段
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: '作业名称不能为空' },
        { status: 400 }
      );
    }
    if (!mappingConfigId || typeof mappingConfigId !== 'string' || mappingConfigId.trim() === '') {
      return NextResponse.json(
        { success: false, error: '请选择数据映射配置' },
        { status: 400 }
      );
    }
    // 验证Cron表达式
    if (schedule && !validateCronExpression(schedule)) {
      return NextResponse.json(
        { success: false, error: 'Cron表达式格式不正确' },
        { status: 400 }
      );
    }
    // 创建作业配置
    const job: SyncJob = {
      id: generateId(),
      name,
      mappingConfigId,
      schedule: schedule || '0 0 * * *',
      conflictStrategy: conflictStrategy || 'overwrite',
      syncMode: syncMode || 'full',
      status: 'idle',
      enabled: enabled !== undefined ? enabled : true,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    // 保存作业配置
    await saveJob(job);
    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'job',
      entityId: job.id,
      action: 'create',
      newConfig: { name, mappingConfigId },
      userId: 'system',
      timestamp: new Date().toISOString()
    });
    Logger.info(`同步作业创建成功: ${name}`, { jobId: job.id });
    return NextResponse.json({
      success: true,
      data: job,
      message: '作业创建成功'
    });
  } catch (error) {
    Logger.error('创建同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '创建作业失败' },
      { status: 500 }
    );
  }
}
// 删除同步作业
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少作业ID' },
        { status: 400 }
      );
    }
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }
    await deleteJob(id);
    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'job',
      entityId: job.id,
      action: 'delete',
      oldConfig: { name: job.name },
      userId: 'system',
      timestamp: new Date().toISOString()
    });
    Logger.info(`同步作业删除成功: ${job.name}`, { jobId: job.id });
    return NextResponse.json({
      success: true,
      message: '作业删除成功'
    });
  } catch (error) {
    Logger.error('删除同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除作业失败' },
      { status: 500 }
    );
  }
}
```

## app/api/mappings/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { 
  getMappings, 
  getMappingById, 
  saveMapping, 
  deleteMapping
} from '@/lib/config/storage';
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mappingId = searchParams.get('id');
    if (mappingId) {
      const mapping = getMappingById(mappingId);
      if (!mapping) {
        return NextResponse.json(
          { success: false, error: '映射配置不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: mapping
      });
    }
    const mappings = getMappings();
    return NextResponse.json({
      success: true,
      data: mappings
    });
  } catch (error) {
    console.error('获取映射配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取映射配置失败' },
      { status: 500 }
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sourceDatabaseId, sourceTableName, targetDocId, targetSheetId, fieldMappings, corpId, targetName, documentName, sheetName } = body;
    if (!name || !sourceDatabaseId || !sourceTableName || !targetDocId || !targetSheetId || !fieldMappings) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：名称、源数据库ID、源表名、目标文档ID、目标工作表ID和字段映射' },
        { status: 400 }
      );
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '映射名称不能为空' },
        { status: 400 }
      );
    }
    if (typeof sourceDatabaseId !== 'string' || sourceDatabaseId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '源数据库ID不能为空' },
        { status: 400 }
      );
    }
    if (typeof sourceTableName !== 'string' || sourceTableName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '源表名不能为空' },
        { status: 400 }
      );
    }
    if (typeof targetDocId !== 'string' || targetDocId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '目标文档ID不能为空' },
        { status: 400 }
      );
    }
    if (typeof targetSheetId !== 'string' || targetSheetId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '目标工作表ID不能为空' },
        { status: 400 }
      );
    }
    if (!Array.isArray(fieldMappings) || fieldMappings.length === 0) {
      return NextResponse.json(
        { success: false, error: '字段映射必须是非空数组' },
        { status: 400 }
      );
    }
    const sourceFieldSet = new Set<string>();
    const targetFieldSet = new Set<string>();
    for (let i = 0; i < fieldMappings.length; i++) {
      const mapping = fieldMappings[i];
      if (!mapping.databaseColumn || typeof mapping.databaseColumn !== 'string' || mapping.databaseColumn.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: `第 ${i + 1} 个字段映射的源字段不能为空` },
          { status: 400 }
        );
      }
      if (!mapping.documentField || typeof mapping.documentField !== 'string' || mapping.documentField.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: `第 ${i + 1} 个字段映射的目标字段不能为空` },
          { status: 400 }
        );
      }
      const sourceField = mapping.databaseColumn.trim();
      const targetField = mapping.documentField.trim();
      if (sourceFieldSet.has(sourceField)) {
        return NextResponse.json(
          { success: false, error: `源字段 "${sourceField}" 被重复映射` },
          { status: 400 }
        );
      }
      sourceFieldSet.add(sourceField);
      if (targetFieldSet.has(targetField)) {
        return NextResponse.json(
          { success: false, error: `目标字段 "${targetField}" 被重复映射` },
          { status: 400 }
        );
      }
      targetFieldSet.add(targetField);
      const validDataTypes = ['string', 'number', 'date', 'boolean', 'json'];
      if (!mapping.dataType || !validDataTypes.includes(mapping.dataType)) {
        return NextResponse.json(
          { success: false, error: `第 ${i + 1} 个字段映射的数据类型无效，必须是 ${validDataTypes.join(', ')} 之一` },
          { status: 400 }
        );
      }
      if (mapping.transform) {
        const validTransforms = ['trim', 'toUpperCase', 'toLowerCase', 'toDate', 'toNumber', 'toString', 'toBoolean'];
        if (!validTransforms.includes(mapping.transform)) {
          return NextResponse.json(
            { success: false, error: `第 ${i + 1} 个字段映射的转换规则 "${mapping.transform}" 无效` },
            { status: 400 }
          );
        }
      }
      if (mapping.defaultValue) {
        if (!validateDefaultValue(mapping.defaultValue, mapping.dataType)) {
          return NextResponse.json(
            { success: false, error: `第 ${i + 1} 个字段映射的默认值 "${mapping.defaultValue}" 不符合数据类型 ${mapping.dataType} 的要求` },
            { status: 400 }
          );
        }
      }
    }
    const newMapping = {
      id: `mapping_${Date.now()}`,
      name,
      sourceDatabaseId,
      sourceTableName,
      targetDocId,
      targetSheetId,
      fieldMappings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      corpId,
      targetName,
      documentName,
      sheetName
    };
    const saved = saveMapping(newMapping);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: '保存映射配置失败' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      data: newMapping,
      message: '映射配置创建成功'
    });
  } catch (error) {
    console.error('创建映射配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '创建映射配置失败' },
      { status: 500 }
    );
  }
}
function validateDefaultValue(value: string, dataType: string): boolean {
  if (!value) return true;
  try {
    switch (dataType) {
      case 'number':
        return !isNaN(Number(value));
      case 'boolean':
        return ['true', 'false', '1', '0'].includes(value.toLowerCase());
      case 'date':
        return !isNaN(Date.parse(value));
      case 'json':
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      case 'string':
      default:
        return true;
    }
  } catch {
    return false;
  }
}
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, sourceDatabaseId, sourceTableName, targetDocId, targetSheetId, fieldMappings, corpId, targetName, documentName, sheetName } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少映射ID' },
        { status: 400 }
      );
    }
    const existingMapping = getMappingById(id);
    if (!existingMapping) {
      return NextResponse.json(
        { success: false, error: '映射配置不存在' },
        { status: 404 }
      );
    }
    const updatedMapping = {
      ...existingMapping,
      name: name || existingMapping.name,
      sourceDatabaseId: sourceDatabaseId || existingMapping.sourceDatabaseId,
      sourceTableName: sourceTableName || existingMapping.sourceTableName,
      targetDocId: targetDocId || existingMapping.targetDocId,
      targetSheetId: targetSheetId || existingMapping.targetSheetId,
      fieldMappings: fieldMappings || existingMapping.fieldMappings,
      updatedAt: new Date().toISOString(),
      corpId: corpId !== undefined ? corpId : existingMapping.corpId,
      targetName: targetName !== undefined ? targetName : existingMapping.targetName,
      documentName: documentName !== undefined ? documentName : existingMapping.documentName,
      sheetName: sheetName !== undefined ? sheetName : existingMapping.sheetName
    };
    const saved = saveMapping(updatedMapping);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: '更新映射配置失败' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      data: updatedMapping,
      message: '映射配置更新成功'
    });
  } catch (error) {
    console.error('更新映射配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新映射配置失败' },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mappingId = searchParams.get('id');
    if (!mappingId) {
      return NextResponse.json(
        { success: false, error: '缺少映射ID' },
        { status: 400 }
      );
    }
    const deleted = deleteMapping(mappingId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '删除映射配置失败' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      message: '映射配置删除成功'
    });
  } catch (error) {
    console.error('删除映射配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除映射配置失败' },
      { status: 500 }
    );
  }
}
```

## app/api/monitoring/job-metrics/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoring.service';
import { Logger } from '@/lib/utils/helpers';
// 获取所有作业指标
export async function GET(request: NextRequest) {
  try {
    const metrics = await monitoringService.getAllJobMetrics();
    return NextResponse.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    Logger.error('获取作业指标失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取指标失败' },
      { status: 500 }
    );
  }
}
```

## app/api/monitoring/system-metrics/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoring.service';
import { Logger } from '@/lib/utils/helpers';
// 获取系统指标
export async function GET(request: NextRequest) {
  try {
    const metrics = await monitoringService.getSystemMetrics();
    return NextResponse.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    Logger.error('获取系统指标失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取指标失败' },
      { status: 500 }
    );
  }
}
```

## app/api/notifications/config/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';
import { Logger } from '@/lib/utils/helpers';
// 获取通知配置
export async function GET(request: NextRequest) {
  try {
    const config = notificationService.getConfig();
    // 脱敏敏感信息
    const sanitizedConfig = {
      ...config,
      email: config.email ? {
        ...config.email,
        password: config.email.password ? '******' : ''
      } : undefined,
      wecom: config.wecom ? {
        ...config.wecom,
        webhookUrl: config.wecom.webhookUrl ? '******' : ''
      } : undefined
    };
    return NextResponse.json({
      success: true,
      data: sanitizedConfig
    });
  } catch (error) {
    Logger.error('获取通知配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}
// 更新通知配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, wecom } = body;
    notificationService.updateConfig({ email, wecom });
    Logger.info('通知配置更新成功');
    return NextResponse.json({
      success: true,
      message: '配置更新成功'
    });
  } catch (error) {
    Logger.error('更新通知配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新配置失败' },
      { status: 500 }
    );
  }
}
```

## app/api/notifications/test/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';
import { Logger } from '@/lib/utils/helpers';
// 测试通知
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;
    let result;
    if (type === 'email') {
      result = await notificationService.testEmailConfig();
    } else if (type === 'wecom') {
      result = await notificationService.testWeComConfig();
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的通知类型' },
        { status: 400 }
      );
    }
    return NextResponse.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    Logger.error('测试通知失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '测试失败' },
      { status: 500 }
    );
  }
}
```

## app/api/scheduler/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { schedulerManager } from '@/lib/services/scheduler';
import { Logger } from '@/lib/utils/helpers';
// 获取调度器状态
export async function GET(request: NextRequest) {
  try {
    const status = schedulerManager.getStatus();
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    Logger.error('获取调度器状态失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取状态失败' },
      { status: 500 }
    );
  }
}
// 重新加载调度器
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    if (action === 'reload') {
      await schedulerManager.reload();
      Logger.info('调度器重新加载成功');
      return NextResponse.json({
        success: true,
        message: '调度器重新加载成功'
      });
    } else if (action === 'shutdown') {
      await schedulerManager.shutdown();
      Logger.info('调度器关闭成功');
      return NextResponse.json({
        success: true,
        message: '调度器关闭成功'
      });
    } else if (action === 'initialize') {
      await schedulerManager.initialize();
      Logger.info('调度器初始化成功');
      return NextResponse.json({
        success: true,
        message: '调度器初始化成功'
      });
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的操作' },
        { status: 400 }
      );
    }
  } catch (error) {
    Logger.error('调度器操作失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
```

## app/api/users/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserById, deleteUser, saveUser, saveHistory } from '@/lib/config/storage';
import { hashPassword, generateId, validatePassword, Logger } from '@/lib/utils/helpers';
// 获取单个用户
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    // 脱敏处理
    const { passwordHash: _, ...userWithoutPassword } = user;
    return NextResponse.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    Logger.error('获取用户信息失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
// 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    const body = await request.json();
    const { email, role, password } = body;
    // 记录旧配置
    const oldConfig = { email: user.email, role: user.role };
    // 更新字段
    if (email && email !== user.email) {
      user.email = email;
    }
    if (role && ['admin', 'user'].includes(role)) {
      user.role = role;
    }
    // 如果要更新密码
    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { success: false, error: passwordValidation.message },
          { status: 400 }
        );
      }
      user.passwordHash = await hashPassword(password);
    }
    user.updatedAt = new Date().toISOString();
    await saveUser(user);
    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'user',
      entityId: user.id,
      action: 'update',
      oldConfig,
      newConfig: { email: user.email, role: user.role },
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    Logger.info(`用户信息更新成功: ${user.username}`, { userId: user.id });
    // 返回用户信息（不包含密码）
    const { passwordHash: _, ...userWithoutPassword } = user;
    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: '更新成功'
    });
  } catch (error) {
    Logger.error('更新用户信息失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新用户信息失败' },
      { status: 500 }
    );
  }
}
// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'user',
      entityId: user.id,
      action: 'delete',
      oldConfig: { username: user.username, email: user.email },
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    await deleteUser(id);
    Logger.info(`用户删除成功: ${user.username}`, { userId: user.id });
    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    Logger.error('删除用户失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除用户失败' },
      { status: 500 }
    );
  }
}
```

## app/api/users/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { UserRegister, UserLogin, User } from '@/types';
import {
  getUserByUsername,
  getUserByEmail,
  saveUser,
  getUsers,
  getUserById,
  deleteUser,
  saveHistory
} from '@/lib/config/storage';
import { hashPassword, verifyPassword, generateId, validatePassword, isValidEmail, Logger } from '@/lib/utils/helpers';
// 用户注册
export async function POST(request: NextRequest) {
  try {
    const body: UserRegister = await request.json();
    const { username, email, password } = body;
    // 验证必填字段
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: '用户名、邮箱和密码不能为空' },
        { status: 400 }
      );
    }
    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: '邮箱格式不正确' },
        { status: 400 }
      );
    }
    // 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }
    // 检查用户名是否已存在
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '用户名已存在' },
        { status: 409 }
      );
    }
    // 检查邮箱是否已存在
    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: '邮箱已被注册' },
        { status: 409 }
      );
    }
    // 创建新用户
    const passwordHash = await hashPassword(password);
    const newUser: User = {
      id: generateId(),
      username,
      email,
      passwordHash,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await saveUser(newUser);
    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'user',
      entityId: newUser.id,
      action: 'create',
      newConfig: { username, email, role: newUser.role },
      userId: newUser.id,
      timestamp: new Date().toISOString()
    });
    Logger.info(`用户注册成功: ${username}`, { userId: newUser.id });
    // 返回用户信息（不包含密码）
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: '注册成功'
    });
  } catch (error) {
    Logger.error('用户注册失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
// 获取用户列表（需要管理员权限）
export async function GET(request: NextRequest) {
  try {
    const users = getUsers();
    // 脱敏处理
    const usersWithoutPasswords = users.map(({ passwordHash: _, ...user }) => user);
    return NextResponse.json({
      success: true,
      data: usersWithoutPasswords
    });
  } catch (error) {
    Logger.error('获取用户列表失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}
```

## app/api/wecom-accounts/[id]/create-sheet/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getWeComAccountById, saveIntelligentDocument } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { WecomSmartSheet } from '@/types';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[API] 开始创建智能表格`, {
      accountId: id,
      timestamp: new Date().toISOString()
    });
    const account = getWeComAccountById(id);
    if (!account) {
      console.error(`[API] 账号不存在`, { accountId: id, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }
    const body = await request.json();
    const { docName, adminUsers, docType } = body;
    if (!docName || !docName.trim()) {
      console.error(`[API] 表格标题不能为空`, { accountId: id, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { success: false, error: '表格标题不能为空' },
        { status: 400 }
      );
    }
    if (!adminUsers || !Array.isArray(adminUsers) || adminUsers.length === 0) {
      console.error(`[API] 管理员ID不能为空`, { accountId: id, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { success: false, error: '管理员ID不能为空' },
        { status: 400 }
      );
    }
    console.log(`[API] 请求参数验证通过`, {
      accountId: id,
      docName: docName.trim(),
      adminUsers,
      docType: docType || 10,
      timestamp: new Date().toISOString()
    });
    try {
      const accessToken = await weComDocumentService.getAccessToken(account.corpId, account.corpSecret);
      console.log(`[API] 获取access_token成功`, {
        accountId: id,
        timestamp: new Date().toISOString()
      });
      console.log(`[API] 调用企业微信智能表格创建API`, {
        endpoint: '/cgi-bin/wedoc/smartsheet/create_sheet',
        accountId: id,
        timestamp: new Date().toISOString()
      });
      const response = await weComDocumentService['client'].post(
        '/cgi-bin/wedoc/create_doc',
        {
          doc_name: docName.trim(),
          admin_users: adminUsers,
          doc_type: docType || 10
        },
        {
          params: {
            access_token: accessToken
          }
        }
      );
      console.log(`[API] 企业微信API响应`, {
        status: response.status,
        errcode: response.data.errcode,
        errmsg: response.data.errmsg,
        hasDocid: !!response.data.docid,
        timestamp: new Date().toISOString()
      });
      if (response.data.errcode !== 0) {
        console.error(`[API] 创建智能表格失败`, {
          accountId: id,
          errcode: response.data.errcode,
          errmsg: response.data.errmsg,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json(
          { 
            success: false, 
            error: `创建智能表格失败: ${response.data.errmsg}`,
            errcode: response.data.errcode
          },
          { status: 400 }
        );
      }
      const documentId = response.data.docid;
      console.log(`[API] 智能表格创建成功`, {
        accountId: id,
        documentId,
        docName: docName.trim(),
        timestamp: new Date().toISOString()
      });
      const newDocument: WecomSmartSheet = {
        id: documentId,
        name: docName.trim(),
        sheetCount: 0,
        createdAt: new Date().toISOString(),
        accountId: id,
        lastSyncTime: new Date().toISOString()
      };
      const saved = saveIntelligentDocument(newDocument);
      if (!saved) {
        console.error(`[API] 保存文档信息失败`, {
          accountId: id,
          documentId,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json(
          { success: false, error: '保存文档信息失败' },
          { status: 500 }
        );
      }
      console.log(`[API] 文档信息保存成功，开始获取Sheet列表`, {
        accountId: id,
        documentId,
        timestamp: new Date().toISOString()
      });
      try {
        const sheets = await weComDocumentService.getDocumentSheets(accessToken, documentId);
        newDocument.sheets = sheets;
        newDocument.sheetCount = sheets.length;
        newDocument.lastSyncTime = new Date().toISOString();
        saveIntelligentDocument(newDocument);
        console.log(`[API] Sheet列表获取成功`, {
          accountId: id,
          documentId,
          sheetCount: sheets.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn(`[API] 获取Sheet列表失败`, {
          accountId: id,
          documentId,
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
      return NextResponse.json({
        success: true,
        data: newDocument,
        message: '智能表格创建成功'
      });
    } catch (error) {
      console.error(`[API] 调用企业微信API异常`, {
        accountId: id,
        error: (error as Error).message,
        stack: (error as Error).stack,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { 
          success: false, 
          error: '调用企业微信API失败，请检查网络连接和账号配置' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] 创建智能表格异常', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { success: false, error: '创建智能表格失败' },
      { status: 500 }
    );
  }
}
```

