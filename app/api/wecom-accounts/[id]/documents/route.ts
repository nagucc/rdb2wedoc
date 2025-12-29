import { NextRequest, NextResponse } from 'next/server';
import { getWeComAccountById, getIntelligentDocumentsByAccountId, saveIntelligentDocument, deleteIntelligentDocument } from '@/lib/config/storage';

interface IntelligentDocument {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'syncing';
  lastSyncTime?: string;
  sheetCount: number;
  createdAt: string;
  accountId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[API] 开始获取智能文档列表`, {
      accountId: id,
      timestamp: new Date().toISOString()
    });

    const account = getWeComAccountById(id);
    
    if (!account) {
      console.error(`[API] 账号不存在`, { accountId: id, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }
    
    const documents = getIntelligentDocumentsByAccountId(id);
    
    console.log(`[API] 成功获取智能文档列表`, {
      accountId: id,
      documentCount: documents.length,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('[API] 获取智能文档列表异常', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { success: false, error: '获取文档列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = getWeComAccountById(id);
    
    if (!account) {
      console.error(`[API] 账号不存在`, { accountId: id, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      console.error(`[API] 文档ID不能为空`, { accountId: id, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { success: false, error: '文档ID不能为空' },
        { status: 400 }
      );
    }

    console.log(`[API] 开始添加智能文档`, {
      accountId: id,
      documentId,
      timestamp: new Date().toISOString()
    });

    const newDocument: IntelligentDocument = {
      id: documentId,
      name: `文档 ${documentId}`,
      status: 'active',
      sheetCount: 0,
      createdAt: new Date().toISOString(),
      accountId: id
    };

    const saved = saveIntelligentDocument(newDocument);
    if (!saved) {
      console.error(`[API] 保存文档失败`, {
        accountId: id,
        documentId,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { success: false, error: '保存文档失败' },
        { status: 500 }
      );
    }

    console.log(`[API] 文档保存成功，开始获取文档名称`, {
      accountId: id,
      documentId,
      timestamp: new Date().toISOString()
    });

    try {
      const nameResponse = await fetch(`${request.nextUrl.origin}/api/wecom-accounts/${id}/documents/${documentId}/name`);
      const nameData = await nameResponse.json();

      if (nameData.success && nameData.data && nameData.data.name) {
        newDocument.name = nameData.data.name;
        newDocument.lastSyncTime = new Date().toISOString();
        saveIntelligentDocument(newDocument);
        
        console.log(`[API] 文档名称更新成功`, {
          accountId: id,
          documentId,
          documentName: newDocument.name,
          lastSyncTime: newDocument.lastSyncTime,
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn(`[API] 获取文档名称失败，使用默认名称`, {
          accountId: id,
          documentId,
          message: nameData.message || '未知错误',
          timestamp: new Date().toISOString()
        });
        newDocument.lastSyncTime = new Date().toISOString();
        saveIntelligentDocument(newDocument);
      }
    } catch (error) {
      console.error(`[API] 获取文档名称时发生错误`, {
        accountId: id,
        documentId,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
      newDocument.lastSyncTime = new Date().toISOString();
      saveIntelligentDocument(newDocument);
    }

    return NextResponse.json({
      success: true,
      data: newDocument,
      message: '文档添加成功'
    });
  } catch (error) {
    console.error('[API] 添加智能文档异常', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { success: false, error: '添加文档失败' },
      { status: 500 }
    );
  }
}