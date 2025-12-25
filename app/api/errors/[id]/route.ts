import { NextRequest, NextResponse } from 'next/server';
import { errorHandlerService } from '@/lib/services/error-handler.service';
import { Logger } from '@/lib/utils/helpers';

/**
 * GET /api/errors/[id]
 * 获取指定ID的错误详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    Logger.info('获取错误详情请求', { errorId: id });

    const errorLog = errorHandlerService.getErrorById(id);

    if (!errorLog) {
      return NextResponse.json({
        success: false,
        error: '错误不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        errorLog
      }
    });
  } catch (error) {
    Logger.error('获取错误详情失败', { 
      errorId: id,
      error: (error as Error).message 
    });
    return NextResponse.json({
      success: false,
      error: '获取错误详情失败'
    }, { status: 500 });
  }
}

/**
 * PUT /api/errors/[id]/resolve
 * 标记错误为已解决
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const { resolvedBy, note } = body;

    Logger.info('标记错误为已解决请求', { errorId: id, resolvedBy });

    if (!resolvedBy) {
      return NextResponse.json({
        success: false,
        error: 'resolvedBy参数是必需的'
      }, { status: 400 });
    }

    const success = errorHandlerService.resolveError(id, resolvedBy, note);

    if (success) {
      return NextResponse.json({
        success: true,
        data: {
          message: '错误已标记为解决'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '错误不存在或标记失败'
      }, { status: 404 });
    }
  } catch (error) {
    Logger.error('标记错误为已解决失败', { 
      errorId: id,
      error: (error as Error).message 
    });
    return NextResponse.json({
      success: false,
      error: '标记错误为已解决失败'
    }, { status: 500 });
  }
}
