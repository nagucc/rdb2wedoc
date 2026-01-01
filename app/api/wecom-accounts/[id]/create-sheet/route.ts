import { NextRequest, NextResponse } from 'next/server';
import { getWeComAccountById, saveIntelligentDocument } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';
import { IntelligentDocument } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[API] 开始创建智能表格`, {
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

    const body = await request.json();
    const { docName, adminUsers, docType } = body;

    if (!docName || !docName.trim()) {
      console.error(`[API] 表格标题不能为空`, { accountId: id, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { success: false, error: '表格标题不能为空' },
        { status: 400 }
      );
    }

    if (!adminUsers || !Array.isArray(adminUsers) || adminUsers.length === 0) {
      console.error(`[API] 管理员ID不能为空`, { accountId: id, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { success: false, error: '管理员ID不能为空' },
        { status: 400 }
      );
    }

    console.log(`[API] 请求参数验证通过`, {
      accountId: id,
      docName: docName.trim(),
      adminUsers,
      docType: docType || 10,
      timestamp: new Date().toISOString()
    });

    try {
      const accessToken = await weComDocumentService.getAccessToken(account.corpId, account.corpSecret);
      
      console.log(`[API] 获取access_token成功`, {
        accountId: id,
        timestamp: new Date().toISOString()
      });

      console.log(`[API] 调用企业微信智能表格创建API`, {
        endpoint: '/cgi-bin/wedoc/smartsheet/create_sheet',
        accountId: id,
        timestamp: new Date().toISOString()
      });

      const response = await weComDocumentService['client'].post(
        '/cgi-bin/wedoc/create_doc',
        {
          doc_name: docName.trim(),
          admin_users: adminUsers,
          doc_type: docType || 10
        },
        {
          params: {
            access_token: accessToken
          }
        }
      );

      console.log(`[API] 企业微信API响应`, {
        status: response.status,
        errcode: response.data.errcode,
        errmsg: response.data.errmsg,
        hasDocid: !!response.data.docid,
        timestamp: new Date().toISOString()
      });

      if (response.data.errcode !== 0) {
        console.error(`[API] 创建智能表格失败`, {
          accountId: id,
          errcode: response.data.errcode,
          errmsg: response.data.errmsg,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json(
          { 
            success: false, 
            error: `创建智能表格失败: ${response.data.errmsg}`,
            errcode: response.data.errcode
          },
          { status: 400 }
        );
      }

      const documentId = response.data.docid;
      
      console.log(`[API] 智能表格创建成功`, {
        accountId: id,
        documentId,
        docName: docName.trim(),
        timestamp: new Date().toISOString()
      });

      const newDocument: IntelligentDocument = {
        id: documentId,
        name: docName.trim(),
        status: 'active',
        sheetCount: 0,
        createdAt: new Date().toISOString(),
        accountId: id,
        lastSyncTime: new Date().toISOString()
      };

      const saved = saveIntelligentDocument(newDocument);
      if (!saved) {
        console.error(`[API] 保存文档信息失败`, {
          accountId: id,
          documentId,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json(
          { success: false, error: '保存文档信息失败' },
          { status: 500 }
        );
      }

      console.log(`[API] 文档信息保存成功，开始获取Sheet列表`, {
        accountId: id,
        documentId,
        timestamp: new Date().toISOString()
      });

      try {
        const sheets = await weComDocumentService.getDocumentSheets(accessToken, documentId);
        
        newDocument.sheets = sheets;
        newDocument.sheetCount = sheets.length;
        newDocument.lastSyncTime = new Date().toISOString();
        saveIntelligentDocument(newDocument);
        
        console.log(`[API] Sheet列表获取成功`, {
          accountId: id,
          documentId,
          sheetCount: sheets.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn(`[API] 获取Sheet列表失败`, {
          accountId: id,
          documentId,
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }

      return NextResponse.json({
        success: true,
        data: newDocument,
        message: '智能表格创建成功'
      });
    } catch (error) {
      console.error(`[API] 调用企业微信API异常`, {
        accountId: id,
        error: (error as Error).message,
        stack: (error as Error).stack,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { 
          success: false, 
          error: '调用企业微信API失败，请检查网络连接和账号配置' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] 创建智能表格异常', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { success: false, error: '创建智能表格失败' },
      { status: 500 }
    );
  }
}