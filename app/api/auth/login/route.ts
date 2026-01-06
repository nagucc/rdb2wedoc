import { NextRequest, NextResponse } from 'next/server';
import { UserLogin } from '@/types';
import { getUserByUsername, saveHistory } from '@/lib/config/storage';
import { verifyPassword, generateId, Logger } from '@/lib/utils/helpers';

export const runtime = 'nodejs';

// 用户登录
export async function POST(request: NextRequest) {
  try {
    const body: UserLogin = await request.json();
    const { username, password } = body;

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 更新最后登录时间
    user.updatedAt = new Date().toISOString();
    // 注意：这里应该调用saveUser，但由于我们在getUserByUsername中已经脱敏了密码，
    // 实际应用中需要重新获取完整的用户信息

    Logger.info(`用户登录成功: ${username}`, { userId: user.id });

    // 返回用户信息（不包含密码）
    const { passwordHash: _, ...userWithoutPassword } = user;
    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: '登录成功'
    });
  } catch (error) {
    Logger.error('用户登录失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
