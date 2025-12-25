import { NextRequest, NextResponse } from 'next/server';
import { DatabaseConnection } from '@/types';
import { getDatabaseById, deleteDatabase, saveDatabase, saveHistory } from '@/lib/config/storage';
import { databaseService } from '@/lib/services/database.service';
import { generateId, validatePort, Logger } from '@/lib/utils/helpers';

// 获取单个数据源
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

    // 脱敏密码
    const { password: _, ...dbWithoutPassword } = database;
    
    return NextResponse.json({
      success: true,
      data: dbWithoutPassword
    });
  } catch (error) {
    Logger.error('获取数据源信息失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取数据源信息失败' },
      { status: 500 }
    );
  }
}

// 更新数据源
export async function PUT(
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

    const body = await request.json();
    const { name, type, host, port, username, password, database: dbName, options } = body;

    // 记录旧配置
    const oldConfig = { name: database.name, type: database.type, host: database.host };

    // 更新字段
    if (name) database.name = name;
    if (type) database.type = type;
    if (host) database.host = host;
    if (port) {
      validatePort(port);
      database.port = port;
    }
    if (username) database.username = username;
    if (password) database.password = password;
    if (dbName) database.database = dbName;
    if (options) database.options = options;

    database.updatedAt = new Date().toISOString();

    // 测试连接
    const isConnected = await databaseService.testConnection(database);
    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: '数据库连接失败，请检查配置' },
        { status: 400 }
      );
    }

    await saveDatabase(database);

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'database',
      entityId: database.id,
      action: 'update',
      oldConfig,
      newConfig: { name: database.name, type: database.type, host: database.host },
      userId: 'system',
      timestamp: new Date().toISOString()
    });

    Logger.info(`数据源更新成功: ${database.name}`, { dbId: database.id });

    // 返回数据源信息（脱敏密码）
    const { password: _, ...dbWithoutPassword } = database;
    return NextResponse.json({
      success: true,
      data: dbWithoutPassword,
      message: '更新成功'
    });
  } catch (error) {
    Logger.error('更新数据源失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新数据源失败' },
      { status: 500 }
    );
  }
}

// 删除数据源
export async function DELETE(
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

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'database',
      entityId: database.id,
      action: 'delete',
      oldConfig: { name: database.name, type: database.type },
      userId: 'system',
      timestamp: new Date().toISOString()
    });

    await deleteDatabase(id);

    Logger.info(`数据源删除成功: ${database.name}`, { dbId: database.id });

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    Logger.error('删除数据源失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除数据源失败' },
      { status: 500 }
    );
  }
}