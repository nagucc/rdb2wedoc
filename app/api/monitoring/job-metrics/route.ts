import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoring.service';
import { Logger } from '@/lib/utils/helpers';

// 获取所有作业指标
export async function GET(request: NextRequest) {
  try {
    const metrics = await monitoringService.getAllJobMetrics();

    return NextResponse.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    Logger.error('获取作业指标失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取指标失败' },
      { status: 500 }
    );
  }
}
