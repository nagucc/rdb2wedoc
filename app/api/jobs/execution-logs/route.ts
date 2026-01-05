import { NextRequest, NextResponse } from 'next/server';
import { listFiles, readJsonFile } from '@/lib/config/storage';
import path from 'path';
import { ExecutionLog } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    const files = listFiles(path.join(DATA_DIR, 'logs'));
    const logs: ExecutionLog[] = [];

    files.forEach(file => {
      try {
        const log = readJsonFile<ExecutionLog>(path.join(DATA_DIR, 'logs', file));
        if (log) {
          if (log.status === 'running' && !log.duration) {
            log.duration = new Date().getTime() - new Date(log.startTime).getTime();
          }
          logs.push(log);
        }
      } catch (error) {
        console.error(`解析日志文件失败: ${file}`, error);
      }
    });

    logs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return NextResponse.json({
      success: true,
      data: logs.slice(0, limit)
    });
  } catch (error) {
    console.error('获取作业执行日志失败:', error);
    return NextResponse.json(
      { success: false, error: '获取日志失败' },
      { status: 500 }
    );
  }
}
