import { NextResponse } from 'next/server';
import { getJobs, getJobLogs } from '@/lib/config/storage';
import { Logger } from '@/lib/utils/helpers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const jobs = await getJobs();
    const days = 7;
    const activityData = new Array(days).fill(0);

    const now = new Date();
    const dayStartTimes: Date[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      dayStartTimes.push(date);
    }

    for (const job of jobs) {
      const logs = await getJobLogs(job.id, 50);

      for (const log of logs) {
        if (log.status !== 'success') {
          continue;
        }

        const logTime = new Date(log.startTime);
        
        for (let i = 0; i < days; i++) {
          const dayStart = dayStartTimes[i];
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);

          if (logTime >= dayStart && logTime < dayEnd) {
            activityData[i] += log.recordsProcessed || 0;
            break;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        activityData,
        days: dayStartTimes.map(date => date.toISOString().split('T')[0])
      }
    });
  } catch (error) {
    Logger.error('获取活动数据失败', { error: (error as Error).message });
    return NextResponse.json(
      {
        success: false,
        error: '获取活动数据失败'
      },
      { status: 500 }
    );
  }
}
