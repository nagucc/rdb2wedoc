import { NextRequest, NextResponse } from 'next/server';
import { getJobById, getJobLogs, saveJobLog } from '@/lib/config/storage';
import { syncService } from '@/lib/services/sync.service';
import { generateId, Logger } from '@/lib/utils/helpers';

// 获取同步作业的执行日志
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

    const logs = await getJobLogs(id);

    return NextResponse.json({
      success: true,
      data: logs
    });
  } catch (error) {
    Logger.error('获取同步作业日志失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取日志失败' },
      { status: 500 }
    );
  }
}

// 手动执行同步作业
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

    // 创建执行日志
    const logId = generateId();
    const startTime = new Date();

    try {
      // 执行同步作业
      await syncService.executeJob(job.id);

      // 记录成功日志
      await saveJobLog({
        id: logId,
        jobId: job.id,
        status: 'success',
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        duration: new Date().getTime() - startTime.getTime(),
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        retryAttempt: 0,
        errorMessage: undefined
      });

      Logger.info(`同步作业手动执行成功: ${job.name}`, { jobId: job.id, logId });

      return NextResponse.json({
        success: true,
        message: '同步执行成功',
        logId
      });
    } catch (error) {
      // 记录失败日志
      await saveJobLog({
        id: logId,
        jobId: job.id,
        status: 'failed',
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        duration: new Date().getTime() - startTime.getTime(),
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        retryAttempt: 0,
        errorMessage: (error as Error).message
      });

      Logger.error(`同步作业手动执行失败: ${job.name}`, { 
        jobId: job.id, 
        logId, 
        error: (error as Error).message 
      });

      return NextResponse.json(
        { success: false, error: '同步执行失败', logId },
        { status: 500 }
      );
    }
  } catch (error) {
    Logger.error('执行同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '执行作业失败' },
      { status: 500 }
    );
  }
}
