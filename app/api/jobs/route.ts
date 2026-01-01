import { NextRequest, NextResponse } from 'next/server';
import { SyncJob } from '@/types';
import { getJobs, getJobById, saveJob, deleteJob, saveHistory } from '@/lib/config/storage';
import { generateId, validateCronExpression, Logger } from '@/lib/utils/helpers';

// 获取所有同步作业
export async function GET(request: NextRequest) {
  try {
    const jobs = getJobs();
    
    return NextResponse.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    Logger.error('获取同步作业列表失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取作业列表失败' },
      { status: 500 }
    );
  }
}

// 创建同步作业
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      mappingConfigId,
      schedule,
      conflictStrategy,
      syncMode,
      enabled 
    } = body;

    // 验证必填字段
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: '作业名称不能为空' },
        { status: 400 }
      );
    }

    if (!mappingConfigId || typeof mappingConfigId !== 'string' || mappingConfigId.trim() === '') {
      return NextResponse.json(
        { success: false, error: '请选择数据映射配置' },
        { status: 400 }
      );
    }

    // 验证Cron表达式
    if (schedule && !validateCronExpression(schedule)) {
      return NextResponse.json(
        { success: false, error: 'Cron表达式格式不正确' },
        { status: 400 }
      );
    }

    // 创建作业配置
    const job: SyncJob = {
      id: generateId(),
      name,
      mappingConfigId,
      schedule: schedule || '0 0 * * *',
      conflictStrategy: conflictStrategy || 'overwrite',
      syncMode: syncMode || 'full',
      status: 'idle',
      enabled: enabled !== undefined ? enabled : true,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 保存作业配置
    await saveJob(job);

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'job',
      entityId: job.id,
      action: 'create',
      newConfig: { name, mappingConfigId },
      userId: 'system',
      timestamp: new Date().toISOString()
    });

    Logger.info(`同步作业创建成功: ${name}`, { jobId: job.id });

    return NextResponse.json({
      success: true,
      data: job,
      message: '作业创建成功'
    });
  } catch (error) {
    Logger.error('创建同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '创建作业失败' },
      { status: 500 }
    );
  }
}

// 删除同步作业
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少作业ID' },
        { status: 400 }
      );
    }

    const job = await getJobById(id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }

    await deleteJob(id);

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'job',
      entityId: job.id,
      action: 'delete',
      oldConfig: { name: job.name },
      userId: 'system',
      timestamp: new Date().toISOString()
    });

    Logger.info(`同步作业删除成功: ${job.name}`, { jobId: job.id });

    return NextResponse.json({
      success: true,
      message: '作业删除成功'
    });
  } catch (error) {
    Logger.error('删除同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除作业失败' },
      { status: 500 }
    );
  }
}
