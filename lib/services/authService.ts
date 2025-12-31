/**
 * 用户认证服务
 * 负责用户登录、登出、会话管理等认证相关功能
 */

import { User, LoginCredentials, AuthSession } from '../../types';

class AuthService {
  private static instance: AuthService;
  private readonly SESSION_KEY = 'auth_session';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24小时

  private constructor() {
    // 私有构造函数，确保单例模式
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * 用户登录
   * @param credentials 登录凭证
   * @returns Promise<AuthSession>
   */
  public async login(credentials: LoginCredentials): Promise<AuthSession> {
    // 参数验证
    if (!credentials.username || !credentials.password) {
      throw new Error('用户名和密码不能为空');
    }

    // 模拟API调用（实际项目中应该调用后端API）
    try {
      // 这里模拟验证用户名密码
      // 实际项目中应该发送请求到后端API进行验证
      const user = await this.validateCredentials(credentials);
      
      // 创建会话
      const session: AuthSession = {
        user,
        token: this.generateToken(user),
        expiresAt: Date.now() + this.SESSION_DURATION
      };

      // 保存会话到本地存储
      this.saveSession(session);

      return session;
    } catch (error) {
      console.error('登录失败:', error);
      throw new Error('用户名或密码错误');
    }
  }

  /**
   * 用户登出
   */
  public async logout(): Promise<void> {
    try {
      // 清除本地存储的会话
      localStorage.removeItem(this.SESSION_KEY);
      
      // 实际项目中可能需要调用后端API使token失效
      console.log('用户已登出');
    } catch (error) {
      console.error('登出失败:', error);
      throw new Error('登出失败');
    }
  }

  /**
   * 获取当前登录用户
   * @returns User | null
   */
  public getCurrentUser(): User | null {
    const session = this.getSession();
    if (!session) {
      return null;
    }

    // 检查会话是否过期
    if (Date.now() > session.expiresAt) {
      this.logout();
      return null;
    }

    return session.user;
  }

  /**
   * 检查用户是否已登录
   * @returns boolean
   */
  public isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * 获取当前会话
   * @returns AuthSession | null
   */
  public getSession(): AuthSession | null {
    try {
      const sessionStr = localStorage.getItem(this.SESSION_KEY);
      if (!sessionStr) {
        return null;
      }
      return JSON.parse(sessionStr) as AuthSession;
    } catch (error) {
      console.error('获取会话失败:', error);
      return null;
    }
  }

  /**
   * 保存会话到本地存储
   * @param session 会话信息
   */
  private saveSession(session: AuthSession): void {
    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('保存会话失败:', error);
      throw new Error('保存会话失败');
    }
  }

  /**
   * 验证用户凭证（模拟实现）
   * @param credentials 登录凭证
   * @returns Promise<User>
   */
  private async validateCredentials(credentials: LoginCredentials): Promise<User> {
    // 模拟验证逻辑
    // 实际项目中应该调用后端API进行验证
    
    // 去除用户名和密码的前后空格
    const trimmedUsername = credentials.username.trim();
    const trimmedPassword = credentials.password.trim();
    
    // 演示用的测试账号
    const testUsers = [
      { username: 'admin', password: 'admin123', role: 'admin' as const },
      { username: 'user', password: 'user123', role: 'user' as const }
    ];

    const testUser = testUsers.find(
      u => u.username === trimmedUsername && u.password === trimmedPassword
    );

    if (!testUser) {
      throw new Error('用户名或密码错误');
    }

    // 返回用户信息
    return {
      id: `user_${Date.now()}`,
      username: testUser.username,
      email: `${testUser.username}@example.com`,
      passwordHash: 'test_hash',
      role: testUser.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 生成token（模拟实现）
   * @param user 用户信息
   * @returns string
   */
  private generateToken(user: User): string {
    // 模拟生成token
    // 实际项目中应该使用JWT或其他安全的token生成方式
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2);
    return `${user.id}_${timestamp}_${randomStr}`;
  }

  /**
   * 刷新会话
   * @returns Promise<AuthSession | null>
   */
  public async refreshSession(): Promise<AuthSession | null> {
    const session = this.getSession();
    if (!session) {
      return null;
    }

    // 更新过期时间
    session.expiresAt = Date.now() + this.SESSION_DURATION;
    this.saveSession(session);

    return session;
  }
}

// 导出单例实例
export const authService = AuthService.getInstance();
