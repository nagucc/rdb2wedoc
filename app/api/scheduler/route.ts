import { NextRequest, NextResponse } from 'next/server';
import { schedulerManager } from '@/lib/services/scheduler';
import { Logger } from '@/lib/utils/helpers';

// 获取调度器状态
export async function GET(request: NextRequest) {
  try {
    const status = schedulerManager.getStatus();

    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    Logger.error('获取调度器状态失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取状态失败' },
      { status: 500 }
    );
  }
}

// 重新加载调度器
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'reload') {
      await schedulerManager.reload();
      Logger.info('调度器重新加载成功');

      return NextResponse.json({
        success: true,
        message: '调度器重新加载成功'
      });
    } else if (action === 'shutdown') {
      await schedulerManager.shutdown();
      Logger.info('调度器关闭成功');

      return NextResponse.json({
        success: true,
        message: '调度器关闭成功'
      });
    } else if (action === 'initialize') {
      await schedulerManager.initialize();
      Logger.info('调度器初始化成功');

      return NextResponse.json({
        success: true,
        message: '调度器初始化成功'
      });
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的操作' },
        { status: 400 }
      );
    }
  } catch (error) {
    Logger.error('调度器操作失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
