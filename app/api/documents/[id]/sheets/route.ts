import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, getIntelligentDocumentById } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { Logger } from '@/lib/utils/helpers';

interface IntelligentDocument {
  id: string;
  name: string;
  status: string;
  sheetCount: number;
  createdAt: string;
  accountId: string;
  lastSyncTime?: string;
  sheets: Array<{
    id: string;
    name: string;
    fields: any[];
  }>;
}

interface DocumentSheet {
  sheet_id: string;
  title: string;
}

// 获取文档的所有Sheet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    Logger.info(`开始获取文档Sheet列表`, { docId: id });

    // 先尝试获取智能文档
    const intelligentDoc = getIntelligentDocumentById(id) as IntelligentDocument | null;
    
    if (intelligentDoc) {
      Logger.info(`找到智能文档，直接返回缓存的Sheet列表`, { 
        docId: id, 
        docName: intelligentDoc.name,
        sheetCount: intelligentDoc.sheets.length 
      });

      const sheets: DocumentSheet[] = intelligentDoc.sheets.map(sheet => ({
        sheet_id: sheet.id,
        title: sheet.name
      }));

      return NextResponse.json({
        success: true,
        data: sheets
      });
    }

    // 如果不是智能文档，尝试获取普通文档
    const document = await getDocumentById(id);
    
    if (!document) {
      Logger.warn(`文档不存在`, { docId: id });
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }

    Logger.info(`找到普通文档，调用企业微信API获取Sheet列表`, { 
      docId: id, 
      docName: document.name 
    });

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
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    Logger.error('获取文档Sheet列表失败', { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { success: false, error: `获取Sheet列表失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}
