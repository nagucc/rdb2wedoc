import { NextRequest, NextResponse } from 'next/server';
import { WeComAccount } from '@/types';
import { getWeComAccounts, saveWeComAccount, saveHistory } from '@/lib/config/storage';
import { generateId, Logger } from '@/lib/utils/helpers';

export async function GET(request: NextRequest) {
  try {
    const accounts = getWeComAccounts();
    
    Logger.info('获取企业微信账号列表成功', { count: accounts.length });
    
    return NextResponse.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    Logger.error('获取企业微信账号列表失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取账号列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, corpId, corpSecret, agentId } = body;

    if (!name || !corpId || !corpSecret || !agentId) {
      return NextResponse.json(
        { success: false, error: '所有字段都必须填写' },
        { status: 400 }
      );
    }

    const account: WeComAccount = {
      id: generateId(),
      name,
      corpId,
      corpSecret,
      agentId,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = saveWeComAccount(account);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: '保存账号失败' },
        { status: 500 }
      );
    }

    await saveHistory({
      id: generateId(),
      entityType: 'wecom_account',
      entityId: account.id,
      action: 'create',
      newConfig: { name, corpId, agentId },
      userId: 'system',
      timestamp: new Date().toISOString()
    });

    Logger.info('企业微信账号创建成功', { accountId: account.id, name });

    const { corpSecret: _, ...accountWithoutSecret } = account;
    return NextResponse.json({
      success: true,
      data: accountWithoutSecret,
      message: '账号创建成功'
    });
  } catch (error) {
    Logger.error('创建企业微信账号失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '创建账号失败' },
      { status: 500 }
    );
  }
}
