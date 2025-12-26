import { NextRequest, NextResponse } from 'next/server';
import { getWeComAccountById } from '@/lib/config/storage';

export async function GET(
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

    const documentName = await fetchDocumentNameFromWeCom(account.corpId, documentId);

    return NextResponse.json({
      success: true,
      data: {
        id: documentId,
        name: documentName
      }
    });
  } catch (error) {
    console.error('获取文档名称失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取文档名称失败' },
      { status: 500 }
    );
  }
}

async function fetchDocumentNameFromWeCom(corpId: string, documentId: string): Promise<string> {
  try {
    const response = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/wedoc/doc_info?docid=${documentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('企业微信API请求失败', { status: response.status });
      return `文档 ${documentId}`;
    }

    const data = await response.json();

    if (data.errcode === 0 && data.doc_info) {
      return data.doc_info.title || `文档 ${documentId}`;
    }

    console.error('企业微信API返回错误', { errcode: data.errcode, errmsg: data.errmsg });
    return `文档 ${documentId}`;
  } catch (error) {
    console.error('调用企业微信API失败', { error: (error as Error).message });
    return `文档 ${documentId}`;
  }
}