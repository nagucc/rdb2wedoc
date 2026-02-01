import { NextRequest, NextResponse } from 'next/server';
import { getJobs, getJobLogs } from '@/lib/config/storage';
import { Logger } from '@/lib/utils/helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const jobs = await getJobs();
    const range = request.nextUrl.searchParams.get('range') || '7days';
    let activityData: number[] = [];
    let timePoints: Date[] = [];

    const now = new Date();

    if (range === 'today' || range === 'yesterday') {
      // 对于今天或昨天，按小时统计
      const hours = 24;
      activityData = new Array(hours).fill(0);
      
      const baseDate = new Date(now);
      if (range === 'yesterday') {
        baseDate.setDate(baseDate.getDate() - 1);
      }
      
      for (let i = 0; i < hours; i++) {
        const hourDate = new Date(baseDate);
        hourDate.setHours(i, 0, 0, 0);
        timePoints.push(hourDate);
      }
    } else if (range === '7days') {
      // 对于最近7天，按天统计
      const days = 7;
      activityData = new Array(days).fill(0);
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        timePoints.push(date);
      }
    } else if (range === '30days') {
      // 对于最近30天，按天统计
      const days = 30;
      activityData = new Array(days).fill(0);
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        timePoints.push(date);
      }
    } else {
      // 默认最近7天
      const days = 7;
      activityData = new Array(days).fill(0);
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        timePoints.push(date);
      }
    }

    for (const job of jobs) {
      const logs = await getJobLogs(job.id, 100); // 增加日志数量限制以获取更多数据

      for (const log of logs) {
        if (log.status !== 'success') {
          continue;
        }

        const logTime = new Date(log.startTime);
        
        for (let i = 0; i < timePoints.length; i++) {
          const timeStart = timePoints[i];
          const timeEnd = new Date(timeStart);
          
          if (range === 'today' || range === 'yesterday') {
            // 对于小时级统计，结束时间为下一小时
            timeEnd.setHours(timeEnd.getHours() + 1);
          } else {
            // 对于天级统计，结束时间为下一天
            timeEnd.setDate(timeEnd.getDate() + 1);
          }

          if (logTime >= timeStart && logTime < timeEnd) {
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
        days: timePoints.map(date => date.toISOString())
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
