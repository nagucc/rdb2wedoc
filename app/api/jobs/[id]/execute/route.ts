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
