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