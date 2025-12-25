/**
 * 登录 API 端点集成测试
 * 
 * 测试范围：
 * 本测试文件专注于验证登录 API 端点（POST /api/auth/login）的集成行为，
 * 包括成功登录场景、无效凭据拒绝、空凭据验证、错误处理和安全性测试。
 * 
 * 测试目标：
 * - 验证 API 端点能够正确处理各种登录请求
 * - 确保错误处理机制能够正确识别和返回适当的错误响应
 * - 验证 API 响应的安全性和数据完整性
 * - 确保与存储层的集成能够正常工作
 * 
 * 核心功能验证点：
 * 1. 成功登录场景：验证有效凭据能够成功登录并返回正确的用户信息
 * 2. 无效凭据场景：验证错误用户名、密码等情况被正确拒绝
 * 3. 空凭据验证：验证空值和缺失字段被正确处理
 * 4. 错误处理：验证无效 JSON 和数据库错误等异常情况的处理
 * 5. 安全性测试：验证敏感信息不会泄露，响应格式正确
 * 
 * 关键测试场景：
 * - 使用有效凭据成功登录
 * - 返回不包含密码的用户信息
 * - 更新用户的最后登录时间
 * - 拒绝错误的密码
 * - 拒绝不存在的用户
 * - 拒绝错误的用户名
 * - 拒绝空用户名
 * - 拒绝空密码
 * - 拒绝空用户名和密码
 * - 拒绝缺失的用户名字段
 * - 拒绝缺失的密码字段
 * - 处理无效的 JSON 请求体
 * - 处理数据库错误
 * - 不返回敏感信息（passwordHash）
 * - 使用正确的 Content-Type
 * 
 * Mock 策略：
 * - 使用 jest.mock 模拟 storage 模块的 getUserByUsername 函数
 * - 在 beforeEach 中创建测试用户并保存到存储
 * - 在 afterEach 中恢复 mock 实现，确保测试隔离性
 * 
 * 预期结果：
 * 所有测试用例应通过，确保登录 API 端点在各种场景下都能正常工作，
 * 包括正常登录、错误处理、数据验证和安全性等方面。
 */

import { POST } from '@/app/api/auth/login/route'
import { NextRequest } from 'next/server'
import { saveUser } from '@/lib/config/storage'
import { hashPassword, generateId } from '@/lib/utils/helpers'

const storage = jest.requireActual('@/lib/config/storage')

jest.mock('@/lib/config/storage', () => ({
  ...jest.requireActual('@/lib/config/storage'),
  getUserByUsername: jest.fn((username: string) => {
    return storage.getUserByUsername(username)
  })
}))

describe('API - Login Endpoint Integration Tests', () => {
  const mockUser = {
    id: generateId(),
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '',
    role: 'user' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  beforeEach(async () => {
    mockUser.passwordHash = await hashPassword('testpassword123')
    saveUser(mockUser)
  })

  describe('POST /api/auth/login - 成功登录场景', () => {
    it('应该使用有效凭据成功登录', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpassword123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.username).toBe('testuser')
      expect(data.data.email).toBe('test@example.com')
      expect(data.data.passwordHash).toBeUndefined()
      expect(data.message).toBe('登录成功')
    })

    it('应该返回不包含密码的用户信息', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpassword123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data).not.toHaveProperty('passwordHash')
      expect(data.data).toHaveProperty('id')
      expect(data.data).toHaveProperty('username')
      expect(data.data).toHaveProperty('email')
      expect(data.data).toHaveProperty('role')
    })

    it('应该更新用户的最后登录时间', async () => {
      const originalUpdatedAt = mockUser.updatedAt

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpassword123'
        })
      })

      await POST(request)

      const updatedUser = storage.getUserByUsername('testuser')
      expect(updatedUser?.updatedAt).not.toBe(originalUpdatedAt)
    })
  })

  describe('POST /api/auth/login - 无效凭据场景', () => {
    it('应该拒绝错误的密码', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          password: 'wrongpassword'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名或密码错误')
    })

    it('应该拒绝不存在的用户', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'nonexistent',
          password: 'password123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名或密码错误')
    })

    it('应该拒绝错误的用户名', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'wronguser',
          password: 'testpassword123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名或密码错误')
    })
  })

  describe('POST /api/auth/login - 空凭据验证', () => {
    it('应该拒绝空用户名', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: '',
          password: 'testpassword123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名和密码不能为空')
    })

    it('应该拒绝空密码', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          password: ''
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名和密码不能为空')
    })

    it('应该拒绝空用户名和密码', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: '',
          password: ''
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名和密码不能为空')
    })

    it('应该拒绝缺失的用户名字段', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          password: 'testpassword123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名和密码不能为空')
    })

    it('应该拒绝缺失的密码字段', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名和密码不能为空')
    })
  })

  describe('POST /api/auth/login - 错误处理', () => {
    it('应该处理无效的JSON请求体', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('登录失败，请稍后重试')
    })

    it('应该处理数据库错误', async () => {
      const { getUserByUsername } = require('@/lib/config/storage')
      
      getUserByUsername.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpassword123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('登录失败，请稍后重试')
    })

    afterEach(() => {
      const { getUserByUsername } = require('@/lib/config/storage')
      getUserByUsername.mockImplementation((username: string) => {
        return storage.getUserByUsername(username)
      })
    })
  })

  describe('POST /api/auth/login - 安全性测试', () => {
    it('应该不返回敏感信息', async () => {
      mockUser.passwordHash = await hashPassword('testpassword123')
      saveUser(mockUser)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpassword123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).not.toHaveProperty('passwordHash')
      expect(data.data).not.toHaveProperty('password')
    })

    it('应该使用正确的Content-Type', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpassword123'
        })
      })

      const response = await POST(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })
})
