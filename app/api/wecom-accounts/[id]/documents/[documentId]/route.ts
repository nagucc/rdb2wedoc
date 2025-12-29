import { NextRequest, NextResponse } from 'next/server';
import { getWeComAccountById, deleteIntelligentDocument } from '@/lib/config/storage';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params;
    console.log(`[API] 开始删除智能文档`, {
      accountId: id,
      documentId,
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

    const deleted = deleteIntelligentDocument(documentId);
    if (!deleted) {
      console.error(`[API] 删除文档失败`, {
        accountId: id,
        documentId,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { success: false, error: '删除文档失败' },
        { status: 500 }
      );
    }

    console.log(`[API] 文档删除成功`, {
      accountId: id,
      documentId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: '文档删除成功'
    });
  } catch (error) {
    console.error('[API] 删除智能文档异常', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { success: false, error: '删除文档失败' },
      { status: 500 }
    );
  }
}