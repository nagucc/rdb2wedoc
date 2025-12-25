import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseById } from '@/lib/config/storage';
import { databaseService } from '@/lib/services/database.service';
import { Logger } from '@/lib/utils/helpers';

// 测试数据库连接
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const database = await getDatabaseById(params.id);
    
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
