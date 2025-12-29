import { NextRequest, NextResponse } from 'next/server';
import { getWeComAccountById, getIntelligentDocumentById, saveIntelligentDocument } from '@/lib/config/storage';
import { weComDocumentService } from '@/lib/services/wecom-document.service';

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateDocumentWithTransaction(
  accountId: string,
  documentId: string,
  updates: { name: string; lastSyncTime: string }
): Promise<{ success: boolean; error?: string; oldTimestamp?: string; newTimestamp?: string }> {
  const oldDocument = getIntelligentDocumentById(documentId);
  
  if (!oldDocument) {
    return { success: false, error: '文档不存在' };
  }

  const oldTimestamp = oldDocument.lastSyncTime;
  const newTimestamp = updates.lastSyncTime;

  try {
    const updatedDocument = {
      ...oldDocument,
      ...updates
    };

    const saveSuccess = saveIntelligentDocument(updatedDocument);

    if (!saveSuccess) {
      throw new Error('保存文档失败');
    }

    console.log(`[API] 文档更新成功 - 事务完成`, {
      accountId,
      documentId,
      oldTimestamp,
      newTimestamp,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      oldTimestamp,
      newTimestamp
    };
  } catch (error) {
    console.error(`[API] 文档更新失败 - 回滚事务`, {
      accountId,
      documentId,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });

    try {
      saveIntelligentDocument(oldDocument);
      console.log(`[API] 事务回滚成功`, {
        accountId,
        documentId,
        timestamp: new Date().toISOString()
      });
    } catch (rollbackError) {
      console.error(`[API] 事务回滚失败`, {
        accountId,
        documentId,
        error: (rollbackError as Error).message,
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: false,
      error: (error as Error).message
    };
  }
}

async function fetchDocumentNameWithRetry(
  corpId: string,
  corpSecret: string,
  documentId: string,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{ name: string; success: boolean; error?: string }> {
  let lastError: string = '';

  for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
    try {
      console.log(`[API] 获取文档名称 - 尝试 ${attempt + 1}/${retryConfig.maxRetries}`, {
        documentId,
        timestamp: new Date().toISOString()
      });

      const accessToken = await weComDocumentService.getAccessToken(corpId, corpSecret);
      console.log(`[API] 成功获取access_token`, {
        accessToken,
        timestamp: new Date().toISOString()
      });

      const docInfo = await weComDocumentService.getDocumentInfo(accessToken, documentId);
      
      if (docInfo.doc_base_info && docInfo.doc_base_info.doc_name) {
        console.log(`[API] 成功获取文档名称`, {
          documentId,
          documentName: docInfo.doc_base_info.doc_name,
          timestamp: new Date().toISOString()
        });

        return {
          name: docInfo.doc_base_info.doc_name,
          success: true
        };
      } else {
        throw new Error('文档信息中未找到标题');
      }
    } catch (error) {
      lastError = (error as Error).message;
      console.error(`[API] 获取文档名称失败 - 尝试 ${attempt + 1}/${retryConfig.maxRetries}`, {
        documentId,
        error: lastError,
        timestamp: new Date().toISOString()
      });

      if (attempt < retryConfig.maxRetries - 1) {
        const delay = retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt);
        console.log(`[API] 等待 ${delay}ms 后重试`, {
          documentId,
          retryAttempt: attempt + 1,
          timestamp: new Date().toISOString()
        });
        await sleep(delay);
      }
    }
  }

  return {
    name: `文档 ${documentId}`,
    success: false,
    error: lastError
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params;
    const account = getWeComAccountById(id);
    
    if (!account) {
      console.error(`[API] 账号不存在`, { accountId: id, timestamp: new Date().toISOString() });
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    console.log(`[API] 开始获取文档名称`, {
      accountId: id,
      documentId,
      timestamp: new Date().toISOString()
    });

    const result = await fetchDocumentNameWithRetry(account.corpId, account.corpSecret, documentId);

    if (!result.success) {
      console.error(`[API] 获取文档名称失败，已达到最大重试次数`, {
        accountId: id,
        documentId,
        error: result.error,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        data: {
          id: documentId,
          name: result.name
        },
        message: '获取文档名称失败，使用默认名称'
      });
    }

    const lastSyncTime = new Date().toISOString();
    
    const updateResult = await updateDocumentWithTransaction(id, documentId, {
      name: result.name,
      lastSyncTime: lastSyncTime
    });

    if (!updateResult.success) {
      console.error(`[API] 更新文档时间戳失败`, {
        accountId: id,
        documentId,
        error: updateResult.error,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: documentId,
        name: result.name,
        lastSyncTime: lastSyncTime
      },
      auditLog: updateResult.success ? {
        oldTimestamp: updateResult.oldTimestamp,
        newTimestamp: updateResult.newTimestamp,
        operation: 'refresh_document',
        timestamp: new Date().toISOString()
      } : undefined,
      message: '获取文档名称成功'
    });
  } catch (error) {
    console.error('[API] 获取文档名称异常', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { success: false, error: '获取文档名称失败' },
      { status: 500 }
    );
  }
}