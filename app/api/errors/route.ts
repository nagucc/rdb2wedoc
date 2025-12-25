import { NextRequest, NextResponse } from 'next/server';
import { errorHandlerService } from '@/lib/services/error-handler.service';
import { Logger } from '@/lib/utils/helpers';

/**
 * GET /api/errors
 * 获取错误日志列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = {
      level: searchParams.get('level') as 'error' | 'warning' | 'info' | undefined,
      category: searchParams.get('category') || undefined,
      resolved: searchParams.get('resolved') === 'true' ? true : 
                searchParams.get('resolved') === 'false' ? false : 
                undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    };

    Logger.info('获取错误日志请求', { filter });

    const logs = errorHandlerService.getErrorLogs(filter);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total: logs.length
      }
    });
  } catch (error) {
    Logger.error('获取错误日志失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '获取错误日志失败'
    }, { status: 500 });
  }
}

/**
 * POST /api/errors
 * 手动记录错误
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      message, 
      level = 'error', 
      category = 'other',
      stack,
      context,
      userId 
    } = body;

    Logger.info('手动记录错误请求', { message, level, category });

    if (!message) {
      return NextResponse.json({
        success: false,
        error: 'message参数是必需的'
      }, { status: 400 });
    }

    // 创建Error对象
    const error = new Error(message);
    if (stack) {
      error.stack = stack;
    }

    const errorLog = errorHandlerService.logError(error, {
      level,
      category,
      context,
      userId
    });

    return NextResponse.json({
      success: true,
      data: {
        errorLog
      }
    });
  } catch (error) {
    Logger.error('记录错误失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '记录错误失败'
    }, { status: 500 });
  }
}
