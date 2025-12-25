import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';
import { Logger } from '@/lib/utils/helpers';

// 测试通知
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    let result;

    if (type === 'email') {
      result = await notificationService.testEmailConfig();
    } else if (type === 'wecom') {
      result = await notificationService.testWeComConfig();
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的通知类型' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    Logger.error('测试通知失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '测试失败' },
      { status: 500 }
    );
  }
}
