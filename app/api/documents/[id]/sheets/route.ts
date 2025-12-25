import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { Logger } from '@/lib/utils/helpers';

// 获取文档的所有Sheet
export async function GET(
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

    const accessToken = await weComDocumentService.getAccessToken(document.id, document.accessToken);
    const sheets = await weComDocumentService.getDocumentSheets(accessToken, document.documentId);

    Logger.info(`获取企业微信文档Sheet列表成功: ${document.name}`, { 
      docId: document.id, 
      sheetCount: sheets.length 
    });

    return NextResponse.json({
      success: true,
      data: sheets
    });
  } catch (error) {
    Logger.error('获取企业微信文档Sheet列表失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取Sheet列表失败' },
      { status: 500 }
    );
  }
}
