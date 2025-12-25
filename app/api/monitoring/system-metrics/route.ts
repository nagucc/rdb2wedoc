import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoring.service';
import { Logger } from '@/lib/utils/helpers';

// 获取系统指标
export async function GET(request: NextRequest) {
  try {
    const metrics = await monitoringService.getSystemMetrics();

    return NextResponse.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    Logger.error('获取系统指标失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取指标失败' },
      { status: 500 }
    );
  }
}
