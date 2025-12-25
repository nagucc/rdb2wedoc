import { NextRequest, NextResponse } from 'next/server';
import { UserRegister, UserLogin, User } from '@/types';
import {
  getUserByUsername,
  getUserByEmail,
  saveUser,
  getUsers,
  getUserById,
  deleteUser,
  saveHistory
} from '@/lib/config/storage';
import { hashPassword, verifyPassword, generateId, validatePassword, isValidEmail, Logger } from '@/lib/utils/helpers';

// 用户注册
export async function POST(request: NextRequest) {
  try {
    const body: UserRegister = await request.json();
    const { username, email, password } = body;

    // 验证必填字段
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: '用户名、邮箱和密码不能为空' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '用户名已存在' },
        { status: 409 }
      );
    }

    // 检查邮箱是否已存在
    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: '邮箱已被注册' },
        { status: 409 }
      );
    }

    // 创建新用户
    const passwordHash = await hashPassword(password);
    const newUser: User = {
      id: generateId(),
      username,
      email,
      passwordHash,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveUser(newUser);

    // 记录历史
    await saveHistory({
      id: generateId(),
      entityType: 'user',
      entityId: newUser.id,
      action: 'create',
      newConfig: { username, email, role: newUser.role },
      userId: newUser.id,
      timestamp: new Date().toISOString()
    });

    Logger.info(`用户注册成功: ${username}`, { userId: newUser.id });

    // 返回用户信息（不包含密码）
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: '注册成功'
    });
  } catch (error) {
    Logger.error('用户注册失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 获取用户列表（需要管理员权限）
export async function GET(request: NextRequest) {
  try {
    const users = getUsers();
    
    // 脱敏处理
    const usersWithoutPasswords = users.map(({ passwordHash: _, ...user }) => user);
    
    return NextResponse.json({
      success: true,
      data: usersWithoutPasswords
    });
  } catch (error) {
    Logger.error('获取用户列表失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}
