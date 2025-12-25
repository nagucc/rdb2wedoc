import { NextRequest, NextResponse } from 'next/server';
import { DatabaseConnection } from '@/types';
import { getDatabases, saveDatabase, saveHistory } from '@/lib/config/storage';
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
