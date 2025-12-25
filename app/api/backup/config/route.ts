import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup.service';
import { Logger } from '@/lib/utils/helpers';

/**
 * GET /api/backup/config
 * 获取备份配置
 */
export async function GET(request: NextRequest) {
  try {
    Logger.info('获取备份配置请求');

    const config = backupService.getConfig();

    // 脱敏处理
    const sanitizedConfig = {
      ...config,
      backupDir: config.backupDir // 可以选择是否隐藏完整路径
    };

    return NextResponse.json({
      success: true,
      data: sanitizedConfig
    });
  } catch (error) {
    Logger.error('获取备份配置失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '获取备份配置失败'
    }, { status: 500 });
  }
}

/**
 * PUT /api/backup/config
 * 更新备份配置
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { backupDir, maxBackups, autoBackup, backupInterval } = body;

    Logger.info('更新备份配置请求', { 
      backupDir, 
      maxBackups, 
      autoBackup, 
      backupInterval 
    });

    // 验证参数
    if (maxBackups !== undefined && (typeof maxBackups !== 'number' || maxBackups < 1)) {
      return NextResponse.json({
        success: false,
        error: 'maxBackups必须是大于0的数字'
      }, { status: 400 });
    }

    if (backupInterval !== undefined && (typeof backupInterval !== 'number' || backupInterval < 1)) {
      return NextResponse.json({
        success: false,
        error: 'backupInterval必须是大于0的数字'
      }, { status: 400 });
    }

    // 更新配置
    backupService.updateConfig({
      backupDir,
      maxBackups,
      autoBackup,
      backupInterval
    });

    // 如果自动备份配置发生变化，重启自动备份
    if (autoBackup !== undefined) {
      if (autoBackup) {
        backupService.startAutoBackup();
      } else {
        backupService.stopAutoBackup();
      }
    }

    const updatedConfig = backupService.getConfig();

    return NextResponse.json({
      success: true,
      data: {
        message: '备份配置更新成功',
        config: updatedConfig
      }
    });
  } catch (error) {
    Logger.error('更新备份配置失败', { error: (error as Error).message });
    return NextResponse.json({
      success: false,
      error: '更新备份配置失败'
    }, { status: 500 });
  }
}
