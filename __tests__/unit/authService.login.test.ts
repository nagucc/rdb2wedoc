/**
 * AuthService 登录功能单元测试
 * 
 * 测试范围：
 * 本测试文件专注于验证 AuthService 的登录功能，包括有效凭据验证、无效凭据拒绝、
 * 空凭据处理以及登录成功后的用户数据返回。
 * 
 * 测试目标：
 * - 验证登录功能在各种场景下的正确性和安全性
 * - 确保错误处理机制能够正确识别和拒绝无效登录尝试
 * - 验证会话管理功能，包括 token 生成和过期时间设置
 * 
 * 核心功能验证点：
 * 1. 有效凭据登录：验证管理员和普通用户能够成功登录
 * 2. 无效凭据拒绝：验证错误用户名、密码、不存在用户等情况被正确拒绝
 * 3. 空凭据验证：验证空值和纯空格的输入被正确处理
 * 4. 用户数据完整性：验证登录后返回完整的用户信息和有效的会话数据
 * 
 * 关键测试场景：
 * - 管理员账户登录（admin/admin123）
 * - 普通用户账户登录（user/user123）
 * - 错误的用户名或密码
 * - 不存在的用户账户
 * - 用户名大小写敏感性
 * - 空用户名或空密码
 * - 纯空格的用户名或密码
 * - 会话持久化到 localStorage
 * - Token 唯一性验证
 * - 会话过期时间准确性
 * 
 * 预期结果：
 * 所有测试用例应通过，确保登录功能在各种边界条件和异常情况下都能正常工作。
 */

import { renderHook, act } from '@testing-library/react'
import { authService, LoginCredentials, User } from '@/lib/services/authService'

describe('AuthService - Login Validation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('有效凭据登录', () => {
    it('应该使用有效的管理员凭据成功登录', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      const result = await authService.login(credentials)

      expect(result).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.user.username).toBe('admin')
      expect(result.user.role).toBe('admin')
      expect(result.token).toBeDefined()
      expect(result.expiresAt).toBeGreaterThan(Date.now())
    })

    it('应该使用有效的普通用户凭据成功登录', async () => {
      const credentials: LoginCredentials = {
        username: 'user',
        password: 'user123'
      }

      const result = await authService.login(credentials)

      expect(result).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.user.username).toBe('user')
      expect(result.user.role).toBe('user')
      expect(result.token).toBeDefined()
    })

    it('登录成功后应该保存会话到localStorage', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      await authService.login(credentials)

      const sessionStr = localStorage.getItem('auth_session')
      expect(sessionStr).toBeDefined()

      const session = JSON.parse(sessionStr!)
      expect(session.user.username).toBe('admin')
      expect(session.token).toBeDefined()
      expect(session.expiresAt).toBeGreaterThan(Date.now())
    })
  })

  describe('无效凭据登录', () => {
    it('应该拒绝错误的用户名', async () => {
      const credentials: LoginCredentials = {
        username: 'wronguser',
        password: 'admin123'
      }

      await expect(authService.login(credentials)).rejects.toThrow('用户名或密码错误')
    })

    it('应该拒绝错误的密码', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'wrongpassword'
      }

      await expect(authService.login(credentials)).rejects.toThrow('用户名或密码错误')
    })

    it('应该拒绝不存在的用户', async () => {
      const credentials: LoginCredentials = {
        username: 'nonexistent',
        password: 'password123'
      }

      await expect(authService.login(credentials)).rejects.toThrow('用户名或密码错误')
    })

    it('应该拒绝大小写错误的用户名', async () => {
      const credentials: LoginCredentials = {
        username: 'ADMIN',
        password: 'admin123'
      }

      await expect(authService.login(credentials)).rejects.toThrow('用户名或密码错误')
    })
  })

  describe('空凭据验证', () => {
    it('应该拒绝空用户名', async () => {
      const credentials: LoginCredentials = {
        username: '',
        password: 'admin123'
      }

      await expect(authService.login(credentials)).rejects.toThrow('用户名和密码不能为空')
    })

    it('应该拒绝空密码', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: ''
      }

      await expect(authService.login(credentials)).rejects.toThrow('用户名和密码不能为空')
    })

    it('应该拒绝空用户名和密码', async () => {
      const credentials: LoginCredentials = {
        username: '',
        password: ''
      }

      await expect(authService.login(credentials)).rejects.toThrow('用户名和密码不能为空')
    })

    it('应该拒绝只有空格的用户名', async () => {
      const credentials: LoginCredentials = {
        username: '   ',
        password: 'admin123'
      }

      await expect(authService.login(credentials)).rejects.toThrow('用户名或密码错误')
    })

    it('应该拒绝只有空格的密码', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: '   '
      }

      await expect(authService.login(credentials)).rejects.toThrow('用户名或密码错误')
    })
  })

  describe('登录成功后的用户数据', () => {
    it('应该返回完整的用户信息', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      const result = await authService.login(credentials)

      expect(result.user).toMatchObject({
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin'
      })
      expect(result.user.id).toBeDefined()
      expect(result.user.createdAt).toBeDefined()
    })

    it('应该生成唯一的token', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      const result1 = await authService.login(credentials)
      const result2 = await authService.login(credentials)

      expect(result1.token).not.toBe(result2.token)
    })

    it('应该设置正确的会话过期时间', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123'
      }

      const now = Date.now()
      const result = await authService.login(credentials)

      const sessionDuration = 24 * 60 * 60 * 1000
      expect(result.expiresAt).toBeGreaterThanOrEqual(now + sessionDuration - 1000)
      expect(result.expiresAt).toBeLessThanOrEqual(now + sessionDuration + 1000)
    })
  })
})
