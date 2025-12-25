import { NextRequest, NextResponse } from 'next/server';
import { getJobById } from '@/lib/config/storage';
import { syncService } from '@/lib/services/sync.service';
import { Logger } from '@/lib/utils/helpers';

// 预览同步作业数据
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

    // 获取预览数据
    const previewData = await syncService.previewData(job);

    Logger.info(`同步作业预览成功: ${job.name}`, { 
      jobId: job.id, 
      recordCount: previewData.length 
    });

    return NextResponse.json({
      success: true,
      data: previewData,
      message: '预览成功'
    });
  } catch (error) {
    Logger.error('预览同步作业失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '预览失败' },
      { status: 500 }
    );
  }
}
