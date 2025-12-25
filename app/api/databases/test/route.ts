import { NextRequest, NextResponse } from 'next/server';
import { DatabaseConnection } from '@/types';
import { databaseService } from '@/lib/services/database.service';
import { Logger } from '@/lib/utils/helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, host, port, username, password, database, options } = body;

    if (!name || !type || !host || !port || !username || !password || !database) {
      return NextResponse.json(
        { success: false, error: '所有字段都必须填写' },
        { status: 400 }
      );
    }

    const testConfig: DatabaseConnection = {
      id: 'test',
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
    
    if (isConnected) {
      Logger.info(`数据库连接测试成功: ${name}`);
      return NextResponse.json({
        success: true,
        message: '连接成功'
      });
    } else {
      return NextResponse.json(
        { success: false, error: '连接失败，请检查配置信息' },
        { status: 400 }
      );
    }
  } catch (error) {
    Logger.error('测试数据库连接失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '连接测试失败，请稍后重试' },
      { status: 500 }
    );
  }
}
