import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';
import { Logger } from '@/lib/utils/helpers';

// 获取通知配置
export async function GET(request: NextRequest) {
  try {
    const config = notificationService.getConfig();

    // 脱敏敏感信息
    const sanitizedConfig = {
      ...config,
      email: config.email ? {
        ...config.email,
        password: config.email.password ? '******' : ''
      } : undefined,
      wecom: config.wecom ? {
        ...config.wecom,
        webhookUrl: config.wecom.webhookUrl ? '******' : ''
      } : undefined
    };

    return NextResponse.json({
      success: true,
      data: sanitizedConfig
    });
  } catch (error) {
    Logger.error('获取通知配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

// 更新通知配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, wecom } = body;

    notificationService.updateConfig({ email, wecom });

    Logger.info('通知配置更新成功');

    return NextResponse.json({
      success: true,
      message: '配置更新成功'
    });
  } catch (error) {
    Logger.error('更新通知配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新配置失败' },
      { status: 500 }
    );
  }
}
