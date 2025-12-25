import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup.service';
import { Logger } from '@/lib/utils/helpers';

/**
 * POST /api/backup/[id]/restore
 * 恢复指定的备份
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    Logger.info('恢复备份请求', { backupId: id });

    const result = await backupService.restoreBackup(id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: result.message
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
        details: result.error
      }, { status: 500 });
    }
  } catch (error) {
    Logger.error('恢复备份失败', { 
      backupId: params.id,
      error: (error as Error).message 
    });
    return NextResponse.json({
      success: false,
      error: '恢复备份失败'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/backup/[id]
 * 删除指定的备份
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    Logger.info('删除备份请求', { backupId: id });

    const success = await backupService.deleteBackup(id);

    if (success) {
      return NextResponse.json({
        success: true,
        data: {
          message: '备份删除成功'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '备份删除失败'
      }, { status: 500 });
    }
  } catch (error) {
    Logger.error('删除备份失败', { 
      backupId: params.id,
      error: (error as Error).message 
    });
    return NextResponse.json({
      success: false,
      error: '删除备份失败'
    }, { status: 500 });
  }
}
