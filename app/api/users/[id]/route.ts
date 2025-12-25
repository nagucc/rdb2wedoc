import { NextRequest, NextResponse } from 'next/server';
import { getUserById, deleteUser, saveUser, saveHistory } from '@/lib/config/storage';
import { hashPassword, generateId, validatePassword, Logger } from '@/lib/utils/helpers';

// 获取单个用户
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserById(params.id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 脱敏处理
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    Logger.error('获取用户信息失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}

// 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserById(params.id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { email, role, password } = body;

    // 记录旧配置
    const oldConfig = { email: user.email, role: user.role };

    // 更新字段
    if (email && email !== user.email) {
      user.email = email;
    }

    if (role && ['admin', 'user'].includes(role)) {
      user.role = role;
    }

    // 如果要更新密码
    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { success: false, error: passwordValidation.message },
          { status: 400 }
        );
      }
      user.passwordHash = await hashPassword(password);
    }

    user.updatedAt = new Date().toISOString();
    await saveUser(user);

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'user',
      entityId: user.id,
      action: 'update',
      oldConfig,
      newConfig: { email: user.email, role: user.role },
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    Logger.info(`用户信息更新成功: ${user.username}`, { userId: user.id });

    // 返回用户信息（不包含密码）
    const { passwordHash: _, ...userWithoutPassword } = user;
    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: '更新成功'
    });
  } catch (error) {
    Logger.error('更新用户信息失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新用户信息失败' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserById(params.id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'user',
      entityId: user.id,
      action: 'delete',
      oldConfig: { username: user.username, email: user.email },
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    await deleteUser(params.id);

    Logger.info(`用户删除成功: ${user.username}`, { userId: user.id });

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    Logger.error('删除用户失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除用户失败' },
      { status: 500 }
    );
  }
}
