import { NextRequest, NextResponse } from 'next/server';
import { WeComAccount } from '@/types';
import { getWeComAccountById, saveWeComAccount, deleteWeComAccount, saveHistory } from '@/lib/config/storage';
import { generateId, Logger } from '@/lib/utils/helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const account = getWeComAccountById(params.id);
    
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }
    
    const { corpSecret: _, ...accountWithoutSecret } = account;
    
    return NextResponse.json({
      success: true,
      data: accountWithoutSecret
    });
  } catch (error) {
    Logger.error('获取企业微信账号详情失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取账号详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, corpId, corpSecret, agentId, enabled } = body;

    const existingAccount = getWeComAccountById(params.id);
    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const updatedAccount: WeComAccount = {
      ...existingAccount,
      name: name || existingAccount.name,
      corpId: corpId || existingAccount.corpId,
      corpSecret: corpSecret || existingAccount.corpSecret,
      agentId: agentId || existingAccount.agentId,
      enabled: enabled !== undefined ? enabled : existingAccount.enabled,
      updatedAt: new Date().toISOString()
    };

    const saved = saveWeComAccount(updatedAccount);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: '更新账号失败' },
        { status: 500 }
      );
    }

    await saveHistory({
      id: generateId(),
      entityType: 'wecom_account',
      entityId: params.id,
      action: 'update',
      oldConfig: { name: existingAccount.name, corpId: existingAccount.corpId },
      newConfig: { name: updatedAccount.name, corpId: updatedAccount.corpId },
      userId: 'system',
      timestamp: new Date().toISOString()
    });

    Logger.info('企业微信账号更新成功', { accountId: params.id });

    const { corpSecret: _, ...accountWithoutSecret } = updatedAccount;
    return NextResponse.json({
      success: true,
      data: accountWithoutSecret,
      message: '账号更新成功'
    });
  } catch (error) {
    Logger.error('更新企业微信账号失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新账号失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existingAccount = getWeComAccountById(params.id);
    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const deleted = deleteWeComAccount(params.id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '删除账号失败' },
        { status: 500 }
      );
    }

    await saveHistory({
      id: generateId(),
      entityType: 'wecom_account',
      entityId: params.id,
      action: 'delete',
      oldConfig: { name: existingAccount.name, corpId: existingAccount.corpId },
      userId: 'system',
      timestamp: new Date().toISOString()
    });

    Logger.info('企业微信账号删除成功', { accountId: params.id });

    return NextResponse.json({
      success: true,
      message: '账号删除成功'
    });
  } catch (error) {
    Logger.error('删除企业微信账号失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除账号失败' },
      { status: 500 }
    );
  }
}
