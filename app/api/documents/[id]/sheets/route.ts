import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, getIntelligentDocumentById, getWeComAccountById } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { Logger } from '@/lib/utils/helpers';

interface WecomSmartSheet {
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

    // 先尝试获取智能表格
    const intelligentDoc = getIntelligentDocumentById(id) as WecomSmartSheet | null;
    
    if (intelligentDoc) {
      Logger.info(`找到智能表格，直接返回缓存的Sheet列表`, { 
        docId: id, 
        docName: intelligentDoc.name,
        sheetCount: intelligentDoc.sheets.length 
      });

      const sheets = intelligentDoc.sheets.map(sheet => ({
        id: sheet.id,
        sheet_id: sheet.id,
        name: sheet.name,
        title: sheet.name,
        fields: sheet.fields || []
      }));

      return NextResponse.json({
        success: true,
        data: sheets
      });
    }

    // 如果不是智能表格，尝试获取普通文档
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

    const account = getWeComAccountById(document.accountId);
    if (!account) {
      Logger.warn(`关联的企业微信账号不存在`, { docId: id, accountId: document.accountId });
      return NextResponse.json(
        { success: false, error: '关联的企业微信账号不存在' },
        { status: 404 }
      );
    }

    const accessToken = await weComDocumentService.getAccessToken(account.corpId, account.corpSecret);
    const sheets = await weComDocumentService.getDocumentSheets(accessToken, document.id);

    const formattedSheets = sheets.map(sheet => ({
      id: sheet.id,
      sheet_id: sheet.id,
      name: sheet.name,
      title: sheet.name,
      fields: sheet.fields || []
    }));

    Logger.info(`获取企业微信文档Sheet列表成功: ${document.name}`, { 
      docId: document.id, 
      sheetCount: formattedSheets.length 
    });

    return NextResponse.json({
      success: true,
      data: formattedSheets
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
