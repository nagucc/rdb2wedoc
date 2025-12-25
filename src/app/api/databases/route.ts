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

    // 验证端口
    validatePort(port);

    // 测试连接
    const testConfig: DatabaseConnection = {
      id: generateId(),
      name,
      type,
      host,
      port,
      username,
      password,
      database,
      options,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const isConnected = await databaseService.testConnection(testConfig);
    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: '数据库连接失败，请检查配置' },
        { status: 400 }
      );
    }

    // 保存数据源配置
    await saveDatabase(testConfig);

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'database',
      entityId: testConfig.id,
      action: 'create',
      newConfig: { name, type, host, port, database },
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
    Logger.error('创建数据源失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '创建数据源失败' },
      { status: 500 }
    );
  }
}
