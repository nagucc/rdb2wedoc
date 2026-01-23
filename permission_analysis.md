# Docker容器内createUser脚本权限错误分析报告

## 一、根本原因分析

### 1. Dockerfile配置
- 容器运行用户：`nextjs`（UID 1001，GID 1001）
- 挂载卷：`/data`目录挂载到容器内
- 脚本位置：`/app/scripts/createUser.js`

### 2. 权限冲突
- 挂载卷`/data`目录及其所有子目录属于`root:root`（UID 0）
- `nextjs`用户（UID 1001）尝试在`/data`目录下创建文件或子目录时，因权限不足失败

### 3. 脚本执行流程
- `createUser.js`脚本复制到`/app/scripts/`目录
- 容器内执行：`node /app/scripts/createUser.js admin Admin123`

## 二、排查步骤

1. **检查容器内当前用户**
   ```bash
   docker exec -it <container_id> whoami
   ```

2. **检查挂载卷权限**
   ```bash
   docker exec -it <container_id> ls -la /data
   ```

3. **检查脚本位置和权限**
   ```bash
   docker exec -it <container_id> ls -la /app/scripts
   ```

4. **手动执行脚本查看错误**
   ```bash
   docker exec -it <container_id> node /app/scripts/createUser.js admin Admin123
   ```

## 三、解决方案

### 1. 修改挂载卷权限
- 宿主机上确保挂载目录及其所有子目录权限正确：
  ```bash
  sudo chown -R 1001:1001 /path/to/host/data
  sudo chmod -R 755 /path/to/host/data
  ```

**说明**：
- 使用`-R`参数递归设置权限，确保所有子目录都有正确的所有者和权限
- `755`权限允许`nextjs`用户写入，其他用户只能读取和执行
- 确保宿主机和容器内的UID/GID匹配（均为1001:1001）

### 2. 修改Dockerfile
在容器启动前创建并设置完整的/data目录权限结构，覆盖所有子目录：
```dockerfile
# 创建完整的/data目录结构并设置权限
RUN mkdir -p /data/users /data/config /data/logs /data/temp
RUN chown -R nextjs:nodejs /data
RUN chmod -R 755 /data
```

**说明**：
- 创建所有需要的子目录：`/data/users`（用户数据）、`/data/config`（配置文件）、`/data/logs`（日志文件）、`/data/temp`（临时文件）
- 使用`-R`参数递归设置权限，确保所有子目录都有正确的所有者和权限
- `755`权限允许`nextjs`用户写入，其他用户只能读取和执行

### 3. 临时解决方案
使用root用户执行脚本：
```bash
docker exec -u root <container_id> node /app/scripts/createUser.js admin Admin123
```

### 4. 脚本内添加权限检查
在createUser.js中添加完整的目录权限检查和错误处理，覆盖所有/data子目录：

```javascript
const dataDir = path.join(__dirname, '..', 'data');
const requiredSubDirs = ['users', 'config', 'logs', 'temp'];

// 检查并创建所有需要的子目录
requiredSubDirs.forEach(subDir => {
  const dirPath = path.join(dataDir, subDir);
  try {
    // 检查目录是否存在且可写
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    } else {
      fs.accessSync(dirPath, fs.constants.W_OK);
    }
  } catch (error) {
    if (error.code === 'EACCES') {
      console.error(`Error: 无权限写入目录 ${dirPath}`);
      console.error(`请确保 ${dirPath} 目录的所有者为 UID 1001 (nextjs用户)`);
      process.exit(1);
    }
    console.error(`Error handling directory ${dirPath}: ${error.message}`);
    process.exit(1);
  }
});
```

## 四、总结
- **根本原因**：容器内`nextjs`用户（UID 1001）无权限写入挂载卷`/data`目录及其所有子目录（属于root）
- **解决方案**：确保挂载卷及其所有子目录的权限与容器运行用户匹配，或使用root用户执行脚本
- **最佳实践**：在容器启动前创建完整的目录结构并设置正确的权限，确保所有子目录都可被`nextjs`用户访问和写入