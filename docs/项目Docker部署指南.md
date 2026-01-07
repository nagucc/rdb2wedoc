# rdb2wedoc 项目 Docker 部署指南

## 目录
1. [获取 Docker 镜像](#1-获取-docker-镜像)
2. [容器部署](#2-容器部署)
3. [环境变量配置](#3-环境变量配置)
4. [初始化用户](#4-初始化用户)
5. [部署验证](#5-部署验证)
6. [常见问题解决](#6-常见问题解决)

---

## 1. 获取 Docker 镜像

### 1.1 镜像信息

rdb2wedoc 项目已发布到 Docker Hub，您可以直接拉取预构建的镜像进行部署。

**镜像名称**: `nagucc/rdb2wedoc`

**可用标签**:
- `latest` - 最新版本
- `production` - 生产环境版本
- `<commit-sha>` - 基于提交 SHA 的唯一标识
- 语义化版本标签（如 `v1.2.3`, `v1.2`, `v1`）

### 1.2 拉取镜像

#### 1.2.1 拉取最新版本

```bash
docker pull nagucc/rdb2wedoc:latest
```

#### 1.2.2 拉取生产版本

```bash
docker pull nagucc/rdb2wedoc:production
```

#### 1.2.3 拉取特定版本

```bash
# 拉取特定提交版本
docker pull nagucc/rdb2wedoc:<commit-sha>

# 拉取语义化版本
docker pull nagucc/rdb2wedoc:v1.2.3
```

### 1.3 验证镜像

拉取镜像后，可以验证镜像是否成功下载：

```bash
# 查看已下载的镜像
docker images | grep rdb2wedoc

# 预期输出示例：  
# nagucc/rdb2wedoc   latest    abc123def456   2 hours ago   450MB
# nagucc/rdb2wedoc   production abc123def456   2 hours ago   450MB

# 查看镜像详细信息
docker inspect nagucc/rdb2wedoc:latest
```

### 1.4 镜像导出与导入（离线部署）

如果需要在离线环境中部署，可以先导出镜像：

#### 1.4.1 导出镜像

```bash
# 导出镜像为 tar 文件
docker save -o rdb2wedoc-latest.tar nagucc/rdb2wedoc:latest

# 压缩镜像文件
gzip rdb2wedoc-latest.tar
```

#### 1.4.2 导入镜像

```bash
# 解压镜像文件
gunzip rdb2wedoc-latest.tar.gz

# 导入镜像
docker load -i rdb2wedoc-latest.tar

# 验证导入
docker images | grep rdb2wedoc
```

---

## 2. 容器部署

### 2.1 基础容器运行

#### 2.1.1 最小化启动

```bash
docker run -d \
  --name rdb2wedoc \
  -p 3000:3000 \
  nagucc/rdb2wedoc:latest
```

#### 2.1.2 完整配置启动

```bash
docker run -d \
  --name rdb2wedoc \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -v rdb2wedoc-data:/app/data \
  --memory="2g" \
  --cpus="2.0" \
  nagucc/rdb2wedoc:latest
```

#### 2.1.3 指定端口启动

```bash
# 使用不同的主机端口
docker run -d \
  --name rdb2wedoc \
  -p 8080:3000 \
  nagucc/rdb2wedoc:latest
```

### 2.2 使用 Docker Compose 部署

#### 2.2.1 创建 docker-compose.yml

在项目根目录创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  rdb2wedoc:
    image: nagucc/rdb2wedoc:production
    container_name: rdb2wedoc
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
    volumes:
      - rdb2wedoc-data:/app/data
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

volumes:
  rdb2wedoc-data:
    driver: local
```

#### 2.2.2 启动服务

```bash
# 启动服务（后台运行）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f

# 停止服务
docker compose down

# 停止服务并删除数据卷
docker compose down -v
```

### 2.3 高级部署配置

#### 2.3.1 带数据库的完整部署

```yaml
version: '3.8'

services:
  rdb2wedoc:
    image: nagucc/rdb2wedoc:production
    container_name: rdb2wedoc
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
    volumes:
      - rdb2wedoc-data:/app/data
    depends_on:
      - postgres
    networks:
      - rdb2wedoc-network

  postgres:
    image: postgres:15-alpine
    container_name: rdb2wedoc-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=rdb2wedoc
      - POSTGRES_USER=rdb2wedoc
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - rdb2wedoc-network

networks:
  rdb2wedoc-network:
    driver: bridge

volumes:
  rdb2wedoc-data:
  postgres-data:
```

#### 2.3.2 带反向代理的部署

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: rdb2wedoc-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - rdb2wedoc
    networks:
      - rdb2wedoc-network

  rdb2wedoc:
    image: nagucc/rdb2wedoc:production
    container_name: rdb2wedoc
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    volumes:
      - rdb2wedoc-data:/app/data
    networks:
      - rdb2wedoc-network

networks:
  rdb2wedoc-network:
    driver: bridge

volumes:
  rdb2wedoc-data:
```

### 2.4 容器管理命令

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 查看容器日志
docker logs rdb2wedoc
docker logs -f rdb2wedoc  # 实时跟踪
docker logs --tail 100 rdb2wedoc  # 最后100行

# 进入容器
docker exec -it rdb2wedoc sh

# 重启容器
docker restart rdb2wedoc

# 停止容器
docker stop rdb2wedoc

# 启动停止的容器
docker start rdb2wedoc

# 删除容器
docker rm rdb2wedoc

# 强制删除运行中的容器
docker rm -f rdb2wedoc

# 查看容器资源使用
docker stats rdb2wedoc

# 查看容器详细信息
docker inspect rdb2wedoc
```

---

## 3. 环境变量配置

### 3.1 必需环境变量

| 变量名 | 默认值 | 说明 | 示例 |
|--------|--------|------|------|
| `NODE_ENV` | `production` | 运行环境 | `production` |
| `PORT` | `3000` | 应用端口 | `3000` |
| `HOSTNAME` | `0.0.0.0` | 监听地址 | `0.0.0.0` |

### 3.2 可选环境变量

| 变量名 | 默认值 | 说明 | 示例 |
|--------|--------|------|------|
| `TZ` | `UTC` | 时区设置 | `Asia/Shanghai` |
| `NEXT_TELEMETRY_DISABLED` | `1` | 禁用遥测 | `1` |

### 3.3 配置环境变量

#### 3.3.1 使用 -e 参数

```bash
docker run -d \
  --name rdb2wedoc \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e TZ=Asia/Shanghai \
  nagucc/rdb2wedoc:latest
```

#### 3.3.2 使用 --env-file

创建 `.env` 文件：

```env
NODE_ENV=production
TZ=Asia/Shanghai
NEXT_TELEMETRY_DISABLED=1
```

启动容器：

```bash
docker run -d \
  --name rdb2wedoc \
  -p 3000:3000 \
  --env-file .env \
  nagucc/rdb2wedoc:latest
```

#### 3.3.3 在 docker-compose.yml 中配置

```yaml
services:
  rdb2wedoc:
    image: nagucc/rdb2wedoc:production
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
      - NEXT_TELEMETRY_DISABLED=1
    env_file:
      - .env
```

### 3.4 数据库连接配置

如果需要连接外部数据库，在应用中配置相应的数据库连接信息：

```bash
# PostgreSQL 示例
docker run -d \
  --name rdb2wedoc \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/dbname \
  nagucc/rdb2wedoc:latest

# MySQL 示例
docker run -d \
  --name rdb2wedoc \
  -p 3000:3000 \
  -e DATABASE_URL=mysql://user:password@host:3306/dbname \
  nagucc/rdb2wedoc:latest
```

---

## 4. 初始化用户

### 4.1 重要说明

⚠️ **部署后必须创建用户账户才能登录系统**

rdb2wedoc 系统使用本地文件存储用户信息，部署后需要通过命令行工具创建初始用户。

### 4.2 在容器内创建用户

#### 4.2.1 方法一：进入容器执行

```bash
# 进入容器
docker exec -it rdb2wedoc sh

# 在容器内创建用户
node scripts/createUser.js admin Admin123

# 退出容器
exit
```

#### 4.2.2 方法二：直接执行命令

```bash
# 创建管理员用户
docker exec rdb2wedoc node scripts/createUser.js admin Admin123
```

### 4.3 在宿主机创建用户

如果项目代码在宿主机上：

```bash
# 确保在项目根目录
cd /path/to/rdb2wedoc

# 创建用户
node scripts/createUser.js admin Admin123
```

### 4.4 用户创建要求

#### 用户名要求
- 长度：3-20 个字符
- 允许字符：字母（a-z, A-Z）、数字（0-9）、下划线（_）
- 示例：`admin`, `user_123`, `TestUser`

#### 密码要求
- 长度：8-128 个字符
- 必须包含：至少一个大写字母
- 必须包含：至少一个小写字母
- 必须包含：至少一个数字
- 示例：`Admin123`, `SecurePass456`

### 4.5 验证用户创建

```bash
# 检查用户文件
docker exec rdb2wedoc cat /app/data/users.json

# 或在宿主机上检查（如果挂载了数据卷）
cat /var/lib/docker/volumes/rdb2wedoc-data/_data/users.json
```

预期输出：
```json
[
  {
    "id": "user_1766986224192_q344jdeebdf",
    "username": "admin",
    "password": "$2b$10$26BgUJ87NjNQRn6YzBS4OubWFgnSM7DrK95.kH.9iQDZqxkf9QyCa",
    "role": "user",
    "createdAt": "2025-12-29T05:30:24.192Z"
  }
]
```

### 4.6 创建多个用户

```bash
# 创建第一个用户
docker exec rdb2wedoc node scripts/createUser.js admin Admin123

# 创建第二个用户
docker exec rdb2wedoc node scripts/createUser.js john SecurePass456

# 创建第三个用户
docker exec rdb2wedoc node scripts/createUser.js jane AnotherPass789
```

### 4.7 用户创建错误处理

#### 用户名已存在
```bash
docker exec rdb2wedoc node scripts/createUser.js admin Admin123
# 输出：错误: 用户名已存在
```

#### 密码不符合要求
```bash
docker exec rdb2wedoc node scripts/createUser.js testuser weak
# 输出：密码验证失败: 密码长度必须至少为8个字符
```

#### 查看帮助
```bash
docker exec rdb2wedoc node scripts/createUser.js --help
```

---

## 5. 部署验证

### 5.1 容器状态检查

```bash
# 检查容器是否运行
docker ps | grep rdb2wedoc

# 预期输出：
# CONTAINER ID   IMAGE              COMMAND          CREATED         STATUS         PORTS                    NAMES
# abc123def456   nagucc/rdb2wedoc:latest   "node server.js" 2 minutes ago   Up 2 minutes   0.0.0.0:3000->3000/tcp   rdb2wedoc
```

### 5.2 容器日志检查

```bash
# 查看容器日志
docker logs rdb2wedoc

# 预期输出包含：
# ✓ Ready in 123ms
# ○ Compiling / ...
# ✓ Compiled / in 234ms
```

### 5.3 健康检查

```bash
# 检查容器健康状态
docker inspect --format='{{.State.Health.Status}}' rdb2wedoc

# 预期输出：healthy
```

### 5.4 网络连接测试

#### 5.4.1 本地测试

```bash
# 测试端口是否监听
curl http://localhost:3000

# 或使用 wget
wget -qO- http://localhost:3000

# 测试特定端点
curl http://localhost:3000/api/health
```

#### 5.4.2 远程测试

```bash
# 从远程服务器测试
curl http://<server-ip>:3000

# 测试登录页面
curl http://<server-ip>:3000/login
```

### 5.5 浏览器访问验证

1. 打开浏览器
2. 访问 `http://<server-ip>:3000`
3. 应该看到登录页面
4. 使用创建的用户账户登录
   - 用户名：`admin`
   - 密码：`Admin123`

### 5.6 功能验证

#### 5.6.1 登录功能

```bash
# 测试登录 API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123"}'
```

#### 5.6.2 检查应用响应

```bash
# 检查首页
curl -I http://localhost:3000

# 预期输出：
# HTTP/1.1 200 OK
# Content-Type: text/html; charset=utf-8
```

### 5.7 性能验证

```bash
# 检查容器资源使用
docker stats rdb2wedoc --no-stream

# 预期输出示例：
# CONTAINER ID   NAME          CPU %     MEM USAGE / LIMIT   MEM %
# abc123def456   rdb2wedoc     0.50%     256MiB / 2GiB       12.5%
```

### 5.8 日志监控

```bash
# 实时监控日志
docker logs -f rdb2wedoc

# 查看最近100行日志
docker logs --tail 100 rdb2wedoc

# 查看最近1小时的日志
docker logs --since 1h rdb2wedoc
```

### 5.9 验证清单

- [ ] 容器正在运行
- [ ] 容器日志无错误
- [ ] 健康检查通过
- [ ] 端口 3000 可访问
- [ ] 浏览器可以访问应用
- [ ] 用户账户已创建
- [ ] 可以成功登录
- [ ] 主要功能正常工作

---

## 6. 常见问题解决

### 6.1 容器启动失败

#### 问题：容器无法启动

**症状：**
```bash
docker ps
# 容器不在列表中
```

**排查步骤：**

1. 查看容器日志
```bash
docker logs rdb2wedoc
```

2. 查看所有容器（包括停止的）
```bash
docker ps -a | grep rdb2wedoc
```

3. 查看容器退出代码
```bash
docker inspect rdb2wedoc | grep -i exitcode
```

**常见原因及解决方案：**

- **端口冲突**
  ```bash
  # 检查端口占用
  sudo netstat -tulpn | grep 3000

  # 解决方案：更换端口
  docker run -d --name rdb2wedoc -p 8080:3000 nagucc/rdb2wedoc:latest
  ```

- **内存不足**
  ```bash
  # 检查系统内存
  free -h

  # 解决方案：增加内存限制或减少其他容器
  docker run -d --name rdb2wedoc -p 3000:3000 --memory="1g" nagucc/rdb2wedoc:latest
  ```

- **权限问题**
  ```bash
  # 检查文件权限
  ls -la /app/data

  # 解决方案：调整权限
  docker exec rdb2wedoc chown -R nextjs:nodejs /app/data
  ```

### 6.2 无法访问应用

#### 问题：浏览器无法访问 http://localhost:3000

**排查步骤：**

1. 检查容器是否运行
```bash
docker ps | grep rdb2wedoc
```

2. 检查端口映射
```bash
docker port rdb2wedoc
```

3. 检查防火墙
```bash
# Ubuntu
sudo ufw status
sudo ufw allow 3000/tcp

# CentOS
sudo firewall-cmd --list-all
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
```

4. 检查网络连接
```bash
curl http://localhost:3000
```

5. 检查容器内部
```bash
docker exec rdb2wedoc wget -O- http://localhost:3000
```

**解决方案：**

- 如果容器内部可以访问但外部不行，检查防火墙和端口映射
- 如果容器内部也无法访问，检查应用日志和配置

### 6.3 用户登录失败

#### 问题：无法使用创建的用户登录

**排查步骤：**

1. 验证用户文件存在
```bash
docker exec rdb2wedoc ls -la /app/data/users.json
```

2. 检查用户文件内容
```bash
docker exec rdb2wedoc cat /app/data/users.json
```

3. 重新创建用户
```bash
docker exec rdb2wedoc node scripts/createUser.js admin Admin123
```

4. 检查应用日志
```bash
docker logs rdb2wedoc | grep -i auth
```

**常见原因：**

- 用户名或密码错误
- 用户文件损坏
- 权限问题

### 6.4 数据持久化问题

#### 问题：容器重启后数据丢失

**排查步骤：**

1. 检查数据卷
```bash
docker volume ls | grep rdb2wedoc
```

2. 检查挂载点
```bash
docker inspect rdb2wedoc | grep -A 10 Mounts
```

**解决方案：**

确保使用数据卷或绑定挂载：

```bash
docker run -d \
  --name rdb2wedoc \
  -p 3000:3000 \
  -v rdb2wedoc-data:/app/data \
  nagucc/rdb2wedoc:latest
```

### 6.5 性能问题

#### 问题：应用响应缓慢

**排查步骤：**

1. 检查容器资源使用
```bash
docker stats rdb2wedoc
```

2. 检查系统资源
```bash
free -h
df -h
top
```

**解决方案：**

- 增加资源限制
  ```bash
  docker run -d \
    --name rdb2wedoc \
    -p 3000:3000 \
    --memory="2g" \
    --cpus="2.0" \
    nagucc/rdb2wedoc:latest
  ```

- 优化应用配置
- 使用缓存

### 6.6 日志问题

#### 问题：日志过多占用磁盘空间

**解决方案：**

1. 配置日志轮转
```bash
docker run -d \
  --name rdb2wedoc \
  -p 3000:3000 \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  nagucc/rdb2wedoc:latest
```

2. 清理旧日志
```bash
docker logs rdb2wedoc > rdb2wedoc.log
docker rm rdb2wedoc
docker run -d --name rdb2wedoc -p 3000:3000 nagucc/rdb2wedoc:latest
```

### 6.7 更新部署

#### 问题：如何更新到新版本

**步骤：**

1. 拉取新镜像
```bash
docker pull nagucc/rdb2wedoc:latest
```

2. 停止旧容器
```bash
docker stop rdb2wedoc
```

3. 删除旧容器
```bash
docker rm rdb2wedoc
```

4. 启动新容器
```bash
docker run -d \
  --name rdb2wedoc \
  -p 3000:3000 \
  -v rdb2wedoc-data:/app/data \
  nagucc/rdb2wedoc:latest
```

5. 验证更新
```bash
docker logs rdb2wedoc
curl http://localhost:3000
```

### 6.8 备份与恢复

#### 备份数据

```bash
# 备份数据卷
docker run --rm \
  -v rdb2wedoc-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/rdb2wedoc-data-backup.tar.gz /data

# 备份用户文件
docker cp rdb2wedoc:/app/data/users.json ./users.json.backup
```

#### 恢复数据

```bash
# 恢复数据卷
docker run --rm \
  -v rdb2wedoc-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/rdb2wedoc-data-backup.tar.gz -C /

# 恢复用户文件
docker cp ./users.json.backup rdb2wedoc:/app/data/users.json
```

### 6.9 获取帮助

如果遇到其他问题：

1. 查看详细日志
```bash
docker logs rdb2wedoc --tail 500
```

2. 检查容器配置
```bash
docker inspect rdb2wedoc
```

3. 查看系统日志
```bash
journalctl -u docker -n 100
```

4. 重启 Docker 服务
```bash
sudo systemctl restart docker
```

---

## 附录

### A. 快速部署脚本

创建 `deploy.sh` 文件：

```bash
#!/bin/bash

set -e

DOCKERHUB_USERNAME="nagucc"
IMAGE_NAME="${DOCKERHUB_USERNAME}/rdb2wedoc:production"

echo "开始部署 rdb2wedoc..."

# 拉取镜像
echo "正在拉取镜像..."
docker pull $IMAGE_NAME

# 停止旧容器
echo "停止旧容器..."
if [ "$(docker ps -aq -f name=rdb2wedoc)" ]; then
    docker stop rdb2wedoc
    docker rm rdb2wedoc
fi

# 启动新容器
echo "启动新容器..."
docker run -d \
  --name rdb2wedoc \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -v rdb2wedoc-data:/app/data \
  $IMAGE_NAME

echo "等待容器启动..."
sleep 10

# 检查容器状态
if docker ps | grep -q rdb2wedoc; then
    echo "✓ 容器启动成功"
    echo "✓ 访问地址: http://localhost:3000"
    echo ""
    echo "下一步：创建用户账户"
    echo "命令: docker exec -it rdb2wedoc sh"
    echo "然后在容器内执行: node scripts/createUser.js <username> <password>"
else
    echo "✗ 容器启动失败"
    docker logs rdb2wedoc
    exit 1
fi
```

使用方法：

```bash
# 赋予执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

### B. 监控脚本

创建 `monitor.sh` 文件：

```bash
#!/bin/bash

echo "=== rdb2wedoc 容器监控 ==="
echo ""

# 容器状态
echo "容器状态："
docker ps -f name=rdb2wedoc --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 资源使用
echo "资源使用："
docker stats rdb2wedoc --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
echo ""

# 最近日志
echo "最近日志（最后20行）："
docker logs --tail 20 rdb2wedoc
echo ""

# 健康检查
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' rdb2wedoc 2>/dev/null || echo "unknown")
echo "健康状态: $HEALTH"
echo ""
```

使用方法：

```bash
chmod +x monitor.sh
./monitor.sh
```

### C. 清理脚本

创建 `cleanup.sh` 文件：

```bash
#!/bin/bash

echo "=== 清理 rdb2wedoc 资源 ==="
echo ""

# 停止并删除容器
if [ "$(docker ps -aq -f name=rdb2wedoc)" ]; then
    echo "停止容器..."
    docker stop rdb2wedoc
    
    echo "删除容器..."
    docker rm rdb2wedoc
    echo "✓ 容器已删除"
else
    echo "未找到运行中的容器"
fi

# 询问是否删除数据卷
read -p "是否删除数据卷？这将删除所有用户数据！(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ "$(docker volume ls -q -f name=rdb2wedoc-data)" ]; then
        echo "删除数据卷..."
        docker volume rm rdb2wedoc-data
        echo "✓ 数据卷已删除"
    else
        echo "未找到数据卷"
    fi
fi

# 询问是否删除镜像
read -p "是否删除镜像？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    DOCKERHUB_USERNAME="nagucc"
    IMAGE_NAME="${DOCKERHUB_USERNAME}/rdb2wedoc"
    
    if docker images | grep -q "$IMAGE_NAME"; then
        echo "删除镜像..."
        docker rmi $IMAGE_NAME:latest $IMAGE_NAME:production 2>/dev/null || true
        echo "✓ 镜像已删除"
    else
        echo "未找到镜像"
    fi
fi

echo ""
echo "清理完成"
```

使用方法：

```bash
chmod +x cleanup.sh
./cleanup.sh
```

### D. 端口映射参考

| 场景 | 主机端口 | 容器端口 | 命令示例 |
|------|---------|---------|---------|
| 默认 | 3000 | 3000 | `-p 3000:3000` |
| HTTP | 80 | 3000 | `-p 80:3000` |
| HTTPS | 443 | 3000 | `-p 443:3000` |
| 自定义 | 8080 | 3000 | `-p 8080:3000` |
| 多端口 | 3000,3001 | 3000,3000 | `-p 3000:3000 -p 3001:3000` |

### E. 资源限制参考

| 场景 | CPU | 内存 | 命令示例 |
|------|-----|------|---------|
| 最小 | 0.5 | 512MB | `--cpus="0.5" --memory="512m"` |
| 标准 | 1.0 | 1GB | `--cpus="1.0" --memory="1g"` |
| 推荐 | 2.0 | 2GB | `--cpus="2.0" --memory="2g"` |
| 高性能 | 4.0 | 4GB | `--cpus="4.0" --memory="4g"` |

### F. 常用命令速查

```bash
# 拉取镜像
docker pull nagucc/rdb2wedoc:production

# 启动容器
docker run -d --name rdb2wedoc -p 3000:3000 nagucc/rdb2wedoc:production

# 查看日志
docker logs -f rdb2wedoc

# 进入容器
docker exec -it rdb2wedoc sh

# 创建用户
docker exec rdb2wedoc node scripts/createUser.js admin Admin123

# 重启容器
docker restart rdb2wedoc

# 停止容器
docker stop rdb2wedoc

# 删除容器
docker rm rdb2wedoc

# 查看容器状态
docker ps -a | grep rdb2wedoc

# 查看资源使用
docker stats rdb2wedoc
```

---

**适用版本**: rdb2wedoc 1.0.0+
