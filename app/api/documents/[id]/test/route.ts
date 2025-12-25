import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { Logger } from '@/lib/utils/helpers';

// 测试企业微信文档连接
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await getDocumentById(id);
    
    if (!document) {
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }

    const isConnected = await weComDocumentService.testConnection(document);

    if (isConnected) {
      Logger.info(`企业微信文档连接测试成功: ${document.name}`, { docId: document.id });
      return NextResponse.json({
        success: true,
        message: '连接成功'
      });
    } else {
      return NextResponse.json(
        { success: false, error: '连接失败，请检查配置' },
        { status: 400 }
      );
    }
  } catch (error) {
    Logger.error('测试企业微信文档连接失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '测试连接失败' },
      { status: 500 }
    );
  }
}
