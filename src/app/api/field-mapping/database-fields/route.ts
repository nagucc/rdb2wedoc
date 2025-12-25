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
