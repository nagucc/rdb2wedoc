这是一个使用 [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) 创建的 [Next.js](https://nextjs.org) 项目。

## 开始使用

### 本地开发

运行开发服务器：

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看结果。

你可以通过修改 `app/page.tsx` 来开始编辑页面。当你编辑文件时，页面会自动更新。

本项目使用 [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) 自动优化和加载 [Geist](https://vercel.com/font) 字体，这是 Vercel 推出的新字体系列。

### 部署

推荐使用 Docker 进行部署，这样可以确保环境一致性和简化部署流程。

📖 [Docker 部署指南](docs/项目Docker部署指南.md)

## ⚠️ 重要：部署后立即创建用户账户

在完成项目部署后，必须先创建用户账户才能登录系统。

### 快速开始

```bash
node scripts/createUser.js <用户名> <密码>
```

**示例：**
```bash
node scripts/createUser.js admin Admin123
```

### 查看帮助

```bash
node scripts/createUser.js --help
```

### 详细文档

如需了解完整的使用说明、配置选项、错误处理和示例，请参阅：
📖 [用户创建工具使用指南](docs/USER_CREATION_GUIDE.md)

## 了解更多

要了解更多关于 Next.js 的信息，请查看以下资源：

- [Next.js 文档](https://nextjs.org/docs) - 了解 Next.js 的功能和 API。
- [学习 Next.js](https://nextjs.org/learn) - 交互式 Next.js 教程。

你可以查看 [Next.js GitHub 仓库](https://github.com/vercel/next.js) - 欢迎你的反馈和贡献！

## 部署到 Vercel

部署 Next.js 应用最简单的方法是使用 Next.js 创建者提供的 [Vercel 平台](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)。

查看我们的 [Next.js 部署文档](https://nextjs.org/docs/app/building-your-application/deploying) 了解更多详情。
