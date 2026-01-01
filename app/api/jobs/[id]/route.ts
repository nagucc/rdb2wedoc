import { NextRequest, NextResponse } from 'next/server';
import { getJobById, updateJob, deleteJob, saveHistory } from '@/lib/config/storage';
import { generateId, validateCronExpression, Logger } from '@/lib/utils/helpers';

// 获取单个同步作业
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: job
    });
  } catch (error) {
    Logger.error('获取同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取作业失败' },
      { status: 500 }
    );
  }
}

// 更新同步作业
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingJob = await getJobById(id);
    
    if (!existingJob) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      mappingConfigId,
      fieldMappings, 
      schedule,
      conflictStrategy,
      enabled 
    } = body;

    // 验证必填字段
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { success: false, error: '作业名称不能为空' },
        { status: 400 }
      );
    }

    if (mappingConfigId !== undefined && (typeof mappingConfigId !== 'string' || mappingConfigId.trim() === '')) {
      return NextResponse.json(
        { success: false, error: '请选择数据映射配置' },
        { status: 400 }
      );
    }

    if (fieldMappings !== undefined && (!Array.isArray(fieldMappings) || fieldMappings.length === 0)) {
      return NextResponse.json(
        { success: false, error: '字段映射不能为空' },
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

    // 更新作业配置
    const updatedJob = {
      ...existingJob,
      name: name || existingJob.name,
      mappingConfigId: mappingConfigId || existingJob.mappingConfigId,
      fieldMappings: fieldMappings || existingJob.fieldMappings,
      schedule: schedule || existingJob.schedule,
      conflictStrategy: conflictStrategy || existingJob.conflictStrategy,
      enabled: enabled !== undefined ? enabled : existingJob.enabled,
      updatedAt: new Date().toISOString()
    };

    await updateJob(updatedJob);

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'job',
      entityId: updatedJob.id,
      action: 'update',
      oldConfig: { name: existingJob.name },
      newConfig: { name: updatedJob.name },
      userId: 'system',
      timestamp: new Date().toISOString()
    });

    Logger.info(`同步作业更新成功: ${updatedJob.name}`, { jobId: updatedJob.id });

    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: '作业更新成功'
    });
  } catch (error) {
    Logger.error('更新同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新作业失败' },
      { status: 500 }
    );
  }
}

// 删除同步作业
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

// 启动同步作业
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }

    const updatedJob = {
      ...job,
      enabled: true,
      updatedAt: new Date().toISOString()
    };

    await updateJob(updatedJob);

    Logger.info(`同步作业启动成功: ${job.name}`, { jobId: job.id });

    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: '作业启动成功'
    });
  } catch (error) {
    Logger.error('启动同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '启动作业失败' },
      { status: 500 }
    );
  }
}

// 停止同步作业
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }

    const updatedJob = {
      ...job,
      enabled: false,
      updatedAt: new Date().toISOString()
    };

    await updateJob(updatedJob);

    Logger.info(`同步作业停止成功: ${job.name}`, { jobId: job.id });

    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: '作业停止成功'
    });
  } catch (error) {
    Logger.error('停止同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '停止作业失败' },
      { status: 500 }
    );
  }
}
