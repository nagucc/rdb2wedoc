# DockerHub 部署配置指南

## 概述

本项目已配置自动化的 Docker 镜像构建和发布流程，将镜像发布至 DockerHub 平台。

## 触发条件

工作流仅在以下情况下触发：
- **production 分支**接收到新的提交时

## 必需的 GitHub Secrets

在 GitHub 仓库中配置以下 Secrets：

### 1. DOCKERHUB_USERNAME
- **描述**: DockerHub 用户名
- **获取方式**: 登录 DockerHub 后，在账户设置中查看
- **配置路径**: GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret

### 2. DOCKERHUB_TOKEN
- **描述**: DockerHub 访问令牌（Access Token）
- **获取方式**:
  1. 登录 [DockerHub](https://hub.docker.com/)
  2. 点击右上角头像 → Account Settings
  3. 左侧菜单选择 "Security"
  4. 点击 "New Access Token"
  5. 输入描述（如 "GitHub Actions"）
  6. 选择权限（建议选择 "Read, Write, Delete"）
  7. 点击 "Generate"
  8. 复制生成的令牌（仅显示一次）
- **安全建议**: 
  - 使用访问令牌而非密码
  - 定期轮换令牌
  - 为不同用途创建不同令牌

## 镜像标签策略

构建的镜像将被打上以下标签：

1. **SHA 标签**: `<commit-sha>` - 基于提交 SHA 的唯一标识
2. **latest 标签**: `latest` - 最新版本（仅 production 分支）
3. **production 标签**: `production` - 生产环境版本（仅 production 分支）
4. **语义化版本标签**（如果有版本标签）:
   - `v1.2.3` - 完整版本号
   - `v1.2` - 主版本和次版本
   - `v1` - 主版本

## 镜像命名

镜像将发布为: `docker.io/<DOCKERHUB_USERNAME>/rdb2wedoc`

## 工作流步骤

### Job 1: build-and-push

1. **检出代码**: 获取最新的代码
2. **设置 Docker Buildx**: 配置多平台构建支持
3. **登录 DockerHub**: 使用配置的凭证登录
4. **提取元数据**: 生成镜像标签和标签信息
5. **构建和推送镜像**:
   - 支持多平台: linux/amd64, linux/arm64
   - 启用构建缓存以加速构建
   - 生成 SBOM（软件物料清单）
   - 启用 provenance（来源证明）
6. **容器验证**: 验证镜像可以正常运行
7. **清理缓存**: 清理构建缓存以释放空间

### Job 2: security-scan

1. **检出代码**: 获取代码库
2. **运行 Trivy 扫描**: 扫描镜像中的安全漏洞（CRITICAL 和 HIGH 级别）
3. **上传扫描结果**: 将结果上传到 GitHub Security 标签页

## 安全最佳实践

✅ **认证安全**
- 使用 DockerHub Access Token 而非密码
- Token 存储在 GitHub Secrets 中
- 最小权限原则

✅ **镜像安全**
- 多阶段构建减小镜像体积
- 使用非 root 用户运行容器
- 启用 SBOM 和 provenance
- 自动安全扫描

✅ **访问控制**
- 仅 production 分支可触发构建
- GitHub 权限最小化（仅读取内容）

✅ **漏洞扫描**
- 使用 Trivy 扫描 CRITICAL 和 HIGH 级别漏洞
- 扫描结果上传到 GitHub Security

## 使用示例

### 拉取镜像

```bash
# 拉取最新版本
docker pull <your-username>/rdb2wedoc:latest

# 拉取生产版本
docker pull <your-username>/rdb2wedoc:production

# 拉取特定提交版本
docker pull <your-username>/rdb2wedoc:<commit-sha>
```

### 运行容器

```bash
docker run -d \
  --name rdb2wedoc \
  -p 3000:3000 \
  -e NODE_ENV=production \
  <your-username>/rdb2wedoc:latest
```

### 使用 Docker Compose

```yaml
version: '3.8'

services:
  rdb2wedoc:
    image: <your-username>/rdb2wedoc:production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

## 部署流程

1. 开发者在其他分支开发功能
2. 功能完成后，创建 Pull Request 到 production 分支
3. 代码审查通过后，合并到 production 分支
4. GitHub Actions 自动触发构建流程
5. 镜像构建完成后推送到 DockerHub
6. 安全扫描自动运行
7. 镜像可用于生产环境部署

## 故障排查

### 构建失败

检查以下内容：
- GitHub Secrets 是否正确配置
- DockerHub 令牌是否有效
- production 分支是否存在
- Dockerfile 是否正确

### 推送失败

检查以下内容：
- DOCKERHUB_TOKEN 权限是否足够
- 镜像名称是否正确
- DockerHub 存储空间是否充足

### 安全扫描失败

- 检查镜像依赖项是否有已知漏洞
- 更新基础镜像到最新版本
- 修复代码中的安全问题

## 维护建议

1. **定期更新依赖**: 保持基础镜像和依赖项最新
2. **监控构建状态**: 定期检查 GitHub Actions 运行状态
3. **审查安全扫描结果**: 及时处理发现的安全问题
4. **轮换访问令牌**: 定期更新 DockerHub 令牌
5. **清理旧镜像**: 定期清理 DockerHub 中的旧镜像

## 相关文件

- `.github/workflows/docker-build-push.yml` - GitHub Actions 工作流配置
- `Dockerfile` - Docker 镜像构建文件
- `.dockerignore` - Docker 构建忽略文件
- `next.config.ts` - Next.js 配置（已启用 standalone 输出）
