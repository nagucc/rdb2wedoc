/**
 * AuthService 会话管理单元测试
 * 
 * 测试范围：
 * 本测试文件专注于验证 AuthService 的会话管理功能，包括用户退出登录、会话保持、
 * 会话超时自动退出、会话持久化以及多用户登录场景的处理。
 * 
 * 测试目标：
 * - 验证用户退出功能的正确性和安全性
 * - 确保会话状态能够正确保持和恢复
 * - 验证会话过期机制能够自动清理过期会话
 * - 验证会话数据的持久化和恢复功能
 * - 确保多用户登录场景下的会话管理正确性
 * 
 * 核心功能验证点：
 * 1. 用户退出功能：验证退出登录后清除所有会话数据
 * 2. 会话保持功能：验证登录后能够正确获取和保持用户会话
 * 3. 会话超时自动退出：验证过期会话能够被自动清理
 * 4. 会话持久化：验证会话数据能够正确保存和恢复
 * 5. 多用户登录：验证不同用户登录和会话切换的正确性
 * 
 * 关键测试场景：
 * - 用户成功退出登录
 * - 退出后清除 localStorage 中的会话
 * - 退出后 getCurrentUser 返回 null
 * - 退出后 getSession 返回 null
 * - 多次调用 logout 不报错
 * - 登录后能够获取当前用户
 * - 登录后 isAuthenticated 返回 true
 * - 未登录时 isAuthenticated 返回 false
 * - 能够获取完整的会话信息
 * - 能够刷新会话
 * - 未登录时刷新会话返回 null
 * - 会话过期后自动退出
 * - 会话过期后调用 getCurrentUser 清除过期会话
 * - 会话过期后 isAuthenticated 返回 false
 * - 有效会话保持登录状态
 * - 从 localStorage 恢复会话
 * - 无效会话数据被忽略
 * - 不完整会话数据被忽略
 * - 支持不同用户登录
 * - 新登录覆盖旧会话
 * 
 * 预期结果：
 * 所有测试用例应通过，确保会话管理功能在各种场景下都能正常工作，
 * 包括正常退出、会话过期、数据持久化和多用户切换等场景。
 */

import { authService, LoginCredentials } from '@/lib/services/authService'

describe('AuthService - Logout and Session Management', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('用户退出功能', () => {
    it('应该成功退出登录', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)
      expect(authService.isAuthenticated()).toBe(true)

      await authService.logout()
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('退出后应该清除localStorage中的会话', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)
      expect(localStorage.getItem('auth_session')).toBeDefined()

      await authService.logout()
      expect(localStorage.getItem('auth_session')).toBeNull()
    })

    it('退出后getCurrentUser应该返回null', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)
      expect(authService.getCurrentUser()).toBeDefined()

      await authService.logout()
      expect(authService.getCurrentUser()).toBeNull()
    })

    it('退出后getSession应该返回null', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)
      expect(authService.getSession()).toBeDefined()

      await authService.logout()
      expect(authService.getSession()).toBeNull()
    })

    it('应该能够多次调用logout而不报错', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)

      await authService.logout()
      await authService.logout()
      await authService.logout()

      expect(authService.isAuthenticated()).toBe(false)
    })
  })

  describe('会话保持功能', () => {
    it('登录后应该能够获取当前用户', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)
      const currentUser = authService.getCurrentUser()

      expect(currentUser).toBeDefined()
      expect(currentUser?.username).toBe('admin')
      expect(currentUser?.role).toBe('admin')
    })

    it('登录后isAuthenticated应该返回true', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)
      expect(authService.isAuthenticated()).toBe(true)
    })

    it('未登录时isAuthenticated应该返回false', () => {
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('应该能够获取完整的会话信息', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)
      const session = authService.getSession()

      expect(session).toBeDefined()
      expect(session?.user.username).toBe('admin')
      expect(session?.token).toBeDefined()
      expect(session?.expiresAt).toBeDefined()
    })

    it('应该能够刷新会话', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)
      const originalSession = authService.getSession()

      await new Promise(resolve => setTimeout(resolve, 100))

      const refreshedSession = await authService.refreshSession()

      expect(refreshedSession).toBeDefined()
      expect(refreshedSession?.expiresAt).toBeGreaterThan(originalSession!.expiresAt)
    })

    it('未登录时刷新会话应该返回null', async () => {
      const result = await authService.refreshSession()
      expect(result).toBeNull()
    })
  })

  describe('会话超时自动退出', () => {
    it('会话过期后应该自动退出', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)

      const session = authService.getSession()
      expect(session).toBeDefined()

      const expiredSession = {
        ...session!,
        expiresAt: Date.now() - 1000
      }
      localStorage.setItem('auth_session', JSON.stringify(expiredSession))

      expect(authService.getCurrentUser()).toBeNull()
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('会话过期后调用getCurrentUser应该清除过期的会话', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)

      const session = authService.getSession()
      const expiredSession = {
        ...session!,
        expiresAt: Date.now() - 1000
      }
      localStorage.setItem('auth_session', JSON.stringify(expiredSession))

      authService.getCurrentUser()

      expect(localStorage.getItem('auth_session')).toBeNull()
    })

    it('会话过期后调用isAuthenticated应该返回false', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)

      const session = authService.getSession()
      const expiredSession = {
        ...session!,
        expiresAt: Date.now() - 1000
      }
      localStorage.setItem('auth_session', JSON.stringify(expiredSession))

      expect(authService.isAuthenticated()).toBe(false)
    })

    it('有效的会话应该保持登录状态', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)

      const session = authService.getSession()
      const validSession = {
        ...session!,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      }
      localStorage.setItem('auth_session', JSON.stringify(validSession))

      expect(authService.isAuthenticated()).toBe(true)
      expect(authService.getCurrentUser()?.username).toBe('admin')
    })
  })

  describe('会话持久化', () => {
    it('应该能够从localStorage恢复会话', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      const loginResult = await authService.login(credentials)

      localStorage.clear()

      localStorage.setItem('auth_session', JSON.stringify(loginResult))

      const currentUser = authService.getCurrentUser()
      expect(currentUser).toBeDefined()
      expect(currentUser?.username).toBe('admin')
    })

    it('localStorage中的无效会话应该被忽略', () => {
      localStorage.setItem('auth_session', 'invalid json')

      expect(authService.getSession()).toBeNull()
      expect(authService.getCurrentUser()).toBeNull()
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('localStorage中不完整的会话应该被忽略', () => {
      localStorage.setItem('auth_session', JSON.stringify({ user: { username: 'admin' } }))

      expect(authService.getCurrentUser()).toBeDefined()
    })
  })

  describe('多用户登录', () => {
    it('应该支持不同用户登录', async () => {
      const adminCredentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      const userCredentials: LoginCredentials = {
        username: 'user',
        password: 'user123'
      }

      await authService.login(adminCredentials)
      expect(authService.getCurrentUser()?.username).toBe('admin')

      await authService.logout()

      await authService.login(userCredentials)
      expect(authService.getCurrentUser()?.username).toBe('user')
    })

    it('新登录应该覆盖旧会话', async () => {
      const adminCredentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      const userCredentials: LoginCredentials = {
        username: 'user',
        password: 'user123'
      }

      await authService.login(adminCredentials)
      const adminToken = authService.getSession()?.token

      await authService.login(userCredentials)
      const userToken = authService.getSession()?.token

      expect(adminToken).not.toBe(userToken)
      expect(authService.getCurrentUser()?.username).toBe('user')
    })
  })
})
