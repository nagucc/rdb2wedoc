import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseById } from '@/lib/config/storage';
import { databaseService } from '@/lib/services/database.service';
import { Logger } from '@/lib/utils/helpers';

// 获取数据库的所有表
export async function GET(
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
