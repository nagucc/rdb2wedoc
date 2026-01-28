import { NextResponse } from 'next/server';
import { getAIConfig } from '@/lib/config';

export async function GET() {
  try {
    const aiConfig = getAIConfig();
    
    // 只返回客户端需要的配置，不包含敏感信息
    const clientSafeConfig = {
      timeout: aiConfig.timeout
    };
    
    return NextResponse.json({
      success: true,
      data: clientSafeConfig
    });
  } catch (error) {
    console.error('获取AI配置失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取AI配置失败'
      },
      { status: 500 }
    );
  }
}
