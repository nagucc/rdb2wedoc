# 用户创建工具使用文档

## 概述

`createUser.js` 脚本是一个命令行工具，用于在 RDB2WeDoc 系统中安全地创建用户账户。它提供了一种安全的方法来添加具有加密密码的用户，并验证输入以确保数据完整性和安全性。

## 目的

该工具设计用于：
- 部署后的初始系统设置
- 管理员用户账户创建
- 无需 Web 界面的安全用户管理
- 部署脚本中的自动化用户配置

## 安装要求

### 前置条件

脚本需要以下依赖项，这些依赖项已包含在项目中：

- **Node.js**: v20 或更高版本
- **bcrypt**: v6.0.0 或更高版本（用于密码加密）
- **fs**: Node.js 内置文件系统模块
- **path**: Node.js 内置路径模块

### 依赖项安装

如果未安装依赖项，请运行：

```bash
npm install
```

所需的依赖包在 `package.json` 中列出：
```json
{
  "dependencies": {
    "bcrypt": "^6.0.0"
  }
}
```

## 配置选项

### 默认配置

脚本使用以下默认设置：

| 设置 | 值 | 描述 |
|---------|-------|-------------|
| `SALT_ROUNDS` | 10 | bcrypt 密码哈希的盐值轮数 |
| `USERS_FILE` | `../data/users.json` | 用户数据文件的路径 |
| `MIN_USERNAME_LENGTH` | 3 | 最小用户名长度 |
| `MAX_USERNAME_LENGTH` | 20 | 最大用户名长度 |
| `MIN_PASSWORD_LENGTH` | 8 | 最小密码长度 |
| `MAX_PASSWORD_LENGTH` | 128 | 最大密码长度 |

### 自定义配置

要修改配置，请编辑 `scripts/createUser.js` 顶部的常量：

```javascript
const SALT_ROUNDS = 10;  // 增加以获得更强的加密（但更慢）
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
```

## 分步使用说明

### 步骤 1：导航到项目根目录

```bash
cd /Users/na57/workshop/rdb2wedoc
```

### 步骤 2：验证脚本存在

```bash
ls -la scripts/createUser.js
```

### 步骤 3：查看帮助信息

```bash
node scripts/createUser.js --help
# 或
node scripts/createUser.js -h
```

### 步骤 4：创建用户

```bash
node scripts/createUser.js <username> <password>
```

示例：
```bash
node scripts/createUser.js admin Admin123
```

### 步骤 5：验证用户创建

检查用户文件：
```bash
cat data/users.json
```

## 输入/输出格式

### 输入参数

脚本接受两个命令行参数：

#### 用户名 (`<username>`)

**格式要求：**
- 长度：3-20 个字符
- 允许的字符：字母（a-z, A-Z）、数字（0-9）、下划线（_）
- 区分大小写

**有效示例：**
- `admin`
- `user_123`
- `TestUser`
- `john_doe`

**无效示例：**
- `ab`（太短）
- `thisusernameistoolong`（太长）
- `user@domain`（包含无效字符）
- `user-name`（包含无效字符）

#### 密码 (`<password>`)

**格式要求：**
- 长度：8-128 个字符
- 必须包含：至少一个大写字母
- 必须包含：至少一个小写字母
- 必须包含：至少一个数字

**有效示例：**
- `Admin123`
- `SecurePass456`
- `MyP@ssw0rd!`（允许特殊字符）
- `Test123456`

**无效示例：**
- `password`（没有大写字母和数字）
- `PASSWORD`（没有小写字母和数字）
- `Password`（没有数字）
- `Pass1`（太短）

### 输出格式

#### 成功输出

```
正在创建用户账户...

✓ 用户账户创建成功!

用户信息:
  用户名: admin
  角色: user
  创建时间: 2025-12-29T05:30:24.192Z

注意: 请妥善保管您的密码，系统不会存储明文密码。
```

#### 错误输出

```
正在创建用户账户...

错误: 用户名已存在
```

### 数据文件格式

用户存储在 `data/users.json` 中，格式如下：

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

**字段说明：**
- `id`: 唯一用户标识符（时间戳 + 随机字符串）
- `username`: 用户的登录用户名
- `password`: bcrypt 哈希密码（从不存储明文）
- `role`: 用户角色（当前始终为 "user"）
- `createdAt`: 账户创建的 ISO 8601 时间戳

## 错误处理

### 错误类型和解决方案

#### 1. 缺少参数

**错误信息：**
```
错误: 缺少必要参数
```

**解决方案：**
提供用户名和密码：
```bash
node scripts/createUser.js admin Admin123
```

#### 2. 用户名验证错误

**错误信息：**
```
用户名验证失败: 用户名长度必须在3-20个字符之间
```

**解决方案：**
选择有效长度的用户名（3-20 个字符）

**错误信息：**
```
用户名验证失败: 用户名只能包含字母、数字和下划线
```

**解决方案：**
删除无效字符（仅使用 a-z, A-Z, 0-9, _）

#### 3. 密码验证错误

**错误信息：**
```
密码验证失败: 密码长度必须至少为8个字符
```

**解决方案：**
使用更长的密码（最少 8 个字符）

**错误信息：**
```
密码验证失败: 密码必须包含大小写字母和数字
```

**解决方案：**
确保密码包含：
- 至少一个大写字母（A-Z）
- 至少一个小写字母（a-z）
- 至少一个数字（0-9）

#### 4. 重复用户名

**错误信息：**
```
错误: 用户名已存在
```

**解决方案：**
选择不同的用户名或先删除现有用户

#### 5. 文件系统错误

**错误信息：**
```
读取用户数据失败: [错误详情]
```
或
```
保存用户数据失败: [错误详情]
```

**解决方案：**
- 确保 `data` 目录存在或可以创建
- 检查文件权限
- 验证磁盘空间可用性

### 退出代码

| 退出代码 | 含义 |
|-----------|---------|
| 0 | 成功 |
| 1 | 发生错误 |

## 示例

### 示例 1：创建第一个管理员用户

```bash
node scripts/createUser.js admin Admin123
```

**输出：**
```
正在创建用户账户...

✓ 用户账户创建成功!

用户信息:
  用户名: admin
  角色: user
  创建时间: 2025-12-29T05:30:24.192Z

注意: 请妥善保管您的密码，系统不会存储明文密码。
```

### 示例 2：创建多个用户

```bash
# 创建第一个用户
node scripts/createUser.js john SecurePass123

# 创建第二个用户
node scripts/createUser.js jane AnotherPass456

# 创建第三个用户
node scripts/createUser.js bob MyPassword789
```

### 示例 3：无效用户名（太短）

```bash
node scripts/createUser.js ab Admin123
```

**输出：**
```
正在创建用户账户...

用户名验证失败: 用户名长度必须在3-20个字符之间
```

### 示例 4：无效密码（弱密码）

```bash
node scripts/createUser.js testuser weak
```

**输出：**
```
正在创建用户账户...

密码验证失败: 密码长度必须至少为8个字符
```

### 示例 5：重复用户名

```bash
# 第一次尝试 - 成功
node scripts/createUser.js admin Admin123

# 第二次尝试 - 失败
node scripts/createUser.js admin Admin123
```

**输出（第二次尝试）：**
```
正在创建用户账户...

错误: 用户名已存在
```

### 示例 6：无效用户名字符

```bash
node scripts/createUser.js user@domain Admin123
```

**输出：**
```
正在创建用户账户...

用户名验证失败: 用户名只能包含字母、数字和下划线
```

## 安全考虑

### 密码加密

- **算法**: bcrypt，使用 10 轮盐值
- **盐值**: 为每个用户自动生成
- **存储**: 仅存储哈希密码（从不存储明文）
- **验证**: 通过比较哈希值来验证密码，而不是解密

### 最佳实践

1. **密码强度**
   - 使用至少 12 个字符的密码
   - 尽可能包含特殊字符
   - 避免常见单词或模式
   - 为每个用户使用唯一密码

2. **用户管理**
   - 仅在需要时创建用户
   - 安全地记录创建的用户名和密码
   - 定期审查用户账户
   - 删除未使用的账户

3. **文件安全**
   - 确保 `data/users.json` 具有适当的权限
   - 定期备份用户文件
   - 永远不要公开共享用户文件
   - 在生产环境中考虑加密用户文件

4. **环境安全**
   - 在安全的环境中运行脚本
   - 除非必要，否则不要以 root 身份运行
   - 保持 Node.js 和依赖项更新
   - 监控安全漏洞

## 故障排除

### 常见问题

**问题：找不到命令**
```bash
# 解决方案：确保你在项目根目录中
cd /Users/na57/workshop/rdb2wedoc
node scripts/createUser.js admin Admin123
```

**问题：权限被拒绝**
```bash
# 解决方案：检查文件权限
chmod +x scripts/createUser.js
```

**问题：找不到模块**
```bash
# 解决方案：安装依赖项
npm install
```

**问题：用户文件损坏**
```bash
# 解决方案：删除文件并重新创建用户
rm data/users.json
node scripts/createUser.js admin Admin123
```

## 与部署集成

### 自动化用户创建

添加到部署脚本中：

```bash
#!/bin/bash

# 部署后
echo "正在创建管理员用户..."
node scripts/createUser.js admin "${ADMIN_PASSWORD}"

if [ $? -eq 0 ]; then
    echo "用户创建成功"
else
    echo "创建用户失败"
    exit 1
fi
```

### 环境变量

对于自动化部署，使用环境变量：

```bash
node scripts/createUser.js "$ADMIN_USERNAME" "$ADMIN_PASSWORD"
```

## 其他资源

- [bcrypt 文档](https://github.com/kelektiv/node.bcrypt.js)
- [Node.js 文件系统](https://nodejs.org/api/fs.html)
- [Node.js 路径模块](https://nodejs.org/api/path.html)
- [密码安全最佳实践](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## 支持

如有问题或疑问：
1. 仔细检查错误消息
2. 查看本文档中的示例
3. 验证您的输入是否符合所有要求
4. 查看项目的主要 README 了解一般信息
