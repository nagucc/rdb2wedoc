import { NextRequest, NextResponse } from 'next/server';
import { WeComDocument } from '@/types';
import { getDocuments, saveDocument, saveHistory } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { generateId, Logger } from '@/lib/utils/helpers';

// 获取所有企业微信文档
export async function GET(request: NextRequest) {
  try {
    const documents = getDocuments();
    
    return NextResponse.json({
      success: true,
      data: documents
    });
  } catch (error) {
    Logger.error('获取企业微信文档列表失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取文档列表失败' },
      { status: 500 }
    );
  }
}

// 创建企业微信文档连接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, accessToken, documentId } = body;

    // 验证必填字段
    if (!name || !accessToken || !documentId) {
      return NextResponse.json(
        { success: false, error: '所有字段都必须填写' },
        { status: 400 }
      );
    }

    // 创建文档配置
    const document: WeComDocument = {
      id: generateId(),
      name,
      accessToken,
      documentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 测试连接
    const isConnected = await weComDocumentService.testConnection(document);
    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: '企业微信文档连接失败，请检查配置' },
        { status: 400 }
      );
    }

    // 保存文档配置
    await saveDocument(document);

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'document',
      entityId: document.id,
      action: 'create',
      newConfig: { name, documentId },
      userId: 'system',
      timestamp: new Date().toISOString()
    });

    Logger.info(`企业微信文档创建成功: ${name}`, { docId: document.id });

    // 返回文档信息（脱敏token）
    const { accessToken: _, ...docWithoutToken } = document;
    return NextResponse.json({
      success: true,
      data: docWithoutToken,
      message: '文档连接成功'
    });
  } catch (error) {
    Logger.error('创建企业微信文档连接失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '创建文档连接失败' },
      { status: 500 }
    );
  }
}
