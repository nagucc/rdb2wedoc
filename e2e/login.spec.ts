import { test, expect } from '@playwright/test'

test.describe('用户登录和退出端到端测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.context().clearCookies()
  })

  test.describe('使用有效凭据成功登录', () => {
    test('应该使用管理员凭据成功登录', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="username"]', 'admin')
      await page.fill('input[name="password"]', 'admin123')
      await page.click('button[type="submit"]')

      await expect(page).toHaveURL('/')
      await expect(page.locator('body')).toBeVisible()
    })

    test('应该使用普通用户凭据成功登录', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="username"]', 'user')
      await page.fill('input[name="password"]', 'user123')
      await page.click('button[type="submit"]')

      await expect(page).toHaveURL('/')
    })

    test('登录成功后应该重定向到首页', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="username"]', 'admin')
      await page.fill('input[name="password"]', 'admin123')
      await page.click('button[type="submit"]')

      await expect(page).toHaveURL('/', { timeout: 5000 })
    })
  })

  test.describe('使用无效凭据登录失败', () => {
    test('应该显示错误信息当密码错误', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="username"]', 'admin')
      await page.fill('input[name="password"]', 'wrongpassword')
      await page.click('button[type="submit"]')

      const errorMessage = page.locator('text=/登录失败|用户名或密码错误/')
      await expect(errorMessage).toBeVisible({ timeout: 3000 })
    })

    test('应该显示错误信息当用户名错误', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="username"]', 'wronguser')
      await page.fill('input[name="password"]', 'admin123')
      await page.click('button[type="submit"]')

      const errorMessage = page.locator('text=/登录失败|用户名或密码错误/')
      await expect(errorMessage).toBeVisible({ timeout: 3000 })
    })

    test('应该显示错误信息当用户不存在', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="username"]', 'nonexistent')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')

      const errorMessage = page.locator('text=/登录失败|用户名或密码错误/')
      await expect(errorMessage).toBeVisible({ timeout: 3000 })
    })

    test('登录失败后应该保持在登录页面', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="username"]', 'wronguser')
      await page.fill('input[name="password"]', 'wrongpassword')
      await page.click('button[type="submit"]')

      await expect(page).toHaveURL('/login')
    })
  })

  test.describe('空凭据提交验证', () => {
    test('应该阻止空用户名提交', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="password"]', 'admin123')
      await page.click('button[type="submit"]')

      const usernameInput = page.locator('input[name="username"]')
      await expect(usernameInput).toHaveAttribute('required')
    })

    test('应该阻止空密码提交', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="username"]', 'admin')
      await page.click('button[type="submit"]')

      const passwordInput = page.locator('input[name="password"]')
      await expect(passwordInput).toHaveAttribute('required')
    })

    test('应该阻止空用户名和密码提交', async ({ page }) => {
      await page.goto('/login')

      await page.click('button[type="submit"]')

      await expect(page.locator('input[name="username"]')).toHaveAttribute('required')
      await expect(page.locator('input[name="password"]')).toHaveAttribute('required')
    })
  })

  test.describe('登录页面UI元素', () => {
    test('应该显示所有必要的表单元素', async ({ page }) => {
      await page.goto('/login')

      await expect(page.locator('h1:has-text("欢迎回来")')).toBeVisible()
      await expect(page.locator('label:has-text("用户名")')).toBeVisible()
      await expect(page.locator('label:has-text("密码")')).toBeVisible()
      await expect(page.locator('input[name="username"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('应该显示测试账号提示', async ({ page }) => {
      await page.goto('/login')

      await expect(page.locator('text=测试账号')).toBeVisible()
      await expect(page.locator('text=admin / admin123')).toBeVisible()
      await expect(page.locator('text=user / user123')).toBeVisible()
    })

    test('应该显示返回首页链接', async ({ page }) => {
      await page.goto('/login')

      const homeLink = page.locator('a:has-text("← 返回首页")')
      await expect(homeLink).toBeVisible()
      await homeLink.click()
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('登录按钮状态', () => {
    test('登录时应该显示加载状态', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="username"]', 'admin')
      await page.fill('input[name="password"]', 'admin123')

      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      await expect(submitButton).toBeDisabled()
      await expect(page.locator('text=登录中...')).toBeVisible()
    })

    test('登录失败后按钮应该恢复可点击状态', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="username"]', 'wrong')
      await page.fill('input[name="password"]', 'wrong')
      await page.click('button[type="submit"]')

      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeEnabled({ timeout: 5000 })
    })
  })

  test.describe('密码输入框', () => {
    test('密码应该被隐藏', async ({ page }) => {
      await page.goto('/login')

      const passwordInput = page.locator('input[name="password"]')
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('应该能够输入密码', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="password"]', 'testpassword')
      const passwordInput = page.locator('input[name="password"]')
      await expect(passwordInput).toHaveValue('testpassword')
    })
  })

  test.describe('响应式设计', () => {
    test('应该在移动设备上正常显示', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/login')

      await expect(page.locator('h1:has-text("欢迎回来")')).toBeVisible()
      await expect(page.locator('input[name="username"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('应该在桌面设备上正常显示', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto('/login')

      await expect(page.locator('h1:has-text("欢迎回来")')).toBeVisible()
      await expect(page.locator('input[name="username"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })
  })

  test.describe('键盘导航', () => {
    test('应该支持Tab键导航', async ({ page }) => {
      await page.goto('/login')

      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="username"]')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="password"]')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('button[type="submit"]')).toBeFocused()
    })

    test('应该支持Enter键提交表单', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="username"]', 'admin')
      await page.fill('input[name="password"]', 'admin123')
      await page.keyboard.press('Enter')

      await expect(page).toHaveURL('/', { timeout: 5000 })
    })
  })
})
