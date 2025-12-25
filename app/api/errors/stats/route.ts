import { NextRequest, NextResponse } from 'next/server';
import { errorHandlerService } from '@/lib/services/error-handler.service';
import { Logger } from '@/lib/utils/helpers';

/**
 * GET /api/errors/stats
 * 获取错误统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');

    Logger.info('获取错误统计请求', { days });

    const stats = errorHandlerService.getErrorStats();
    const trend = errorHandlerService.getErrorTrend(days);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        trend
      }
    });
  } catch (error) {
    Logger.error('获取错误统计失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '获取错误统计失败'
    }, { status: 500 });
  }
}

/**
 * POST /api/errors/batch-resolve
 * 批量解决错误
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, resolvedBy, note } = body;

    Logger.info('批量解决错误请求', { category, resolvedBy });

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'category参数是必需的'
      }, { status: 400 });
    }

    if (!resolvedBy) {
      return NextResponse.json({
        success: false,
        error: 'resolvedBy参数是必需的'
      }, { status: 400 });
    }

    const count = errorHandlerService.resolveErrorsByCategory(
      category,
      resolvedBy,
      note
    );

    return NextResponse.json({
      success: true,
      data: {
        message: `已解决${count}个错误`,
        count
      }
    });
  } catch (error) {
    Logger.error('批量解决错误失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '批量解决错误失败'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/errors/clear
 * 清除错误日志
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'resolved';

    Logger.info('清除错误日志请求', { type });

    let count = 0;
    if (type === 'resolved') {
      count = errorHandlerService.clearResolvedErrors();
    } else if (type === 'all') {
      errorHandlerService.clearAllErrors();
    } else {
      return NextResponse.json({
        success: false,
        error: '不支持的清除类型，必须是resolved或all'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: type === 'all' ? '已清除所有错误日志' : `已清除${count}个已解决的错误`,
        count
      }
    });
  } catch (error) {
    Logger.error('清除错误日志失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '清除错误日志失败'
    }, { status: 500 });
  }
}
