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
