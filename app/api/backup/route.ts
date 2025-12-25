import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup.service';
import { Logger } from '@/lib/utils/helpers';

/**
 * GET /api/backup
 * 获取所有备份列表
 */
export async function GET(request: NextRequest) {
  try {
    Logger.info('获取备份列表请求');

    const backups = await backupService.listBackups();
    const stats = await backupService.getBackupStats();

    return NextResponse.json({
      success: true,
      data: {
        backups,
        stats
      }
    });
  } catch (error) {
    Logger.error('获取备份列表失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '获取备份列表失败'
    }, { status: 500 });
  }
}

/**
 * POST /api/backup
 * 创建备份
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'full', description } = body;

    Logger.info('创建备份请求', { type, description });

    let result;
    if (type === 'full') {
      result = await backupService.createFullBackup(description);
    } else if (type === 'incremental') {
      result = await backupService.createIncrementalBackup(description);
    } else {
      return NextResponse.json({
        success: false,
        error: '不支持的备份类型'
      }, { status: 400 });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          backupId: result.backupId,
          filename: result.filename
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    Logger.error('创建备份失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '创建备份失败'
    }, { status: 500 });
  }
}
