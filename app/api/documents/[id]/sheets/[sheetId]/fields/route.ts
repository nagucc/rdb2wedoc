import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, getWeComAccountById } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { Logger } from '@/lib/utils/helpers';

// 获取Sheet的字段信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  try {
    const { id, sheetId } = await params;
    const document = await getDocumentById(id);
    
    if (!document) {
      return NextResponse.json(
        { success: false, error: '文档不存在' },
        { status: 404 }
      );
    }

    const account = getWeComAccountById(document.accountId);
    if (!account) {
      return NextResponse.json(
        { success: false, error: '关联的企业微信账号不存在' },
        { status: 404 }
      );
    }

    const accessToken = await weComDocumentService.getAccessToken(account.corpId, account.corpSecret);
    const fields = await weComDocumentService.getSheetFields(accessToken, document.id, sheetId);

    Logger.info(`获取企业微信文档Sheet字段成功: ${document.name}`, { 
      docId: document.id, 
      sheetId: sheetId,
      fieldCount: fields.length 
    });

    return NextResponse.json({
      success: true,
      data: fields
    });
  } catch (error) {
    Logger.error('获取企业微信文档Sheet字段失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取字段信息失败' },
      { status: 500 }
    );
  }
}
