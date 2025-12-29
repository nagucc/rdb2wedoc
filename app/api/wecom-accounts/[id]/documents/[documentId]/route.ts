import { NextRequest, NextResponse } from 'next/server';
import { getWeComAccountById, deleteIntelligentDocument } from '@/lib/config/storage';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params;
    const account = getWeComAccountById(id);
    
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const deleted = deleteIntelligentDocument(documentId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '删除文档失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '文档删除成功'
    });
  } catch (error) {
    console.error('删除智能文档失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除文档失败' },
      { status: 500 }
    );
  }
}