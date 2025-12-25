import { NextRequest, NextResponse } from 'next/server';
import { WeComDocument } from '@/types';
import { getDocumentById, deleteDocument, saveDocument, saveHistory } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { generateId, Logger } from '@/lib/utils/helpers';

// 获取单个企业微信文档
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await getDocumentById(params.id);
    
    if (!document) {
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }

    // 脱敏token
    const { accessToken: _, ...docWithoutToken } = document;
    
    return NextResponse.json({
      success: true,
      data: docWithoutToken
    });
  } catch (error) {
    Logger.error('获取企业微信文档信息失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取文档信息失败' },
      { status: 500 }
    );
  }
}

// 更新企业微信文档
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await getDocumentById(params.id);
    
    if (!document) {
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, accessToken, documentId } = body;

    // 记录旧配置
    const oldConfig = { name: document.name, documentId: document.documentId };

    // 更新字段
    if (name) document.name = name;
    if (accessToken) document.accessToken = accessToken;
    if (documentId) document.documentId = documentId;

    document.updatedAt = new Date().toISOString();

    // 测试连接
    const isConnected = await weComDocumentService.testConnection(document);
    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: '企业微信文档连接失败，请检查配置' },
        { status: 400 }
      );
    }

    await saveDocument(document);

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'document',
      entityId: document.id,
      action: 'update',
      oldConfig,
      newConfig: { name: document.name, documentId: document.documentId },
      userId: 'system',
      timestamp: new Date().toISOString()
    });

    Logger.info(`企业微信文档更新成功: ${document.name}`, { docId: document.id });

    // 返回文档信息（脱敏token）
    const { accessToken: _, ...docWithoutToken } = document;
    return NextResponse.json({
      success: true,
      data: docWithoutToken,
      message: '更新成功'
    });
  } catch (error) {
    Logger.error('更新企业微信文档失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新文档失败' },
      { status: 500 }
    );
  }
}

// 删除企业微信文档
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await getDocumentById(params.id);
    
    if (!document) {
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'document',
      entityId: document.id,
      action: 'delete',
      oldConfig: { name: document.name, documentId: document.documentId },
      userId: 'system',
      timestamp: new Date().toISOString()
    });

    await deleteDocument(params.id);

    Logger.info(`企业微信文档删除成功: ${document.name}`, { docId: document.id });

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    Logger.error('删除企业微信文档失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除文档失败' },
      { status: 500 }
    );
  }
}
