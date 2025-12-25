import { NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoring.service';

export async function GET() {
  try {
    const [systemMetrics, jobMetrics] = await Promise.all([
      monitoringService.getSystemMetrics(),
      monitoringService.getAllJobMetrics()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        systemMetrics,
        jobMetrics
      }
    });
  } catch (error) {
    console.error('获取Dashboard数据失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取Dashboard数据失败'
      },
      { status: 500 }
    );
  }
}
