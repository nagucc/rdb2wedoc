import { NextRequest, NextResponse } from 'next/server';
import { getWeComAccountById } from '@/lib/config/storage';

interface IntelligentDocument {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'syncing';
  lastSyncTime?: string;
  sheetCount: number;
  createdAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = getWeComAccountById(id);
    
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }
    
    const documents: IntelligentDocument[] = [];
    
    return NextResponse.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('获取智能文档列表失败', { error: (error as Error).message });
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
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: '文档ID不能为空' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: documentId,
        name: `文档 ${documentId}`,
        status: 'active',
        sheetCount: 0,
        createdAt: new Date().toISOString()
      },
      message: '文档添加成功'
    });
  } catch (error) {
    console.error('添加智能文档失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '添加文档失败' },
      { status: 500 }
    );
  }
}