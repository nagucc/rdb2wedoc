# RDB2WeDoc v1.4版本开发计划

## 需求分析
根据版本规划文档，v1.4版本需要实现以下功能：

1. **MySQL日志存储功能**：增加使用MySQL数据库管理同步作业的日志功能，运维人员可以通过配置文件选择使用MySQL还是默认的文件存储方式。

2. **数据映射删除修复**：修复删除数据映射时的问题，确保删除数据映射后同时删除相应的配置文件。

3. **GitHub Action优化**：新增GitHub Action，每次发布到production分支时，自动触发docker构建，构建为amd64架构的镜像，并将镜像tar包release到github release中。

## 实现计划

### 1. MySQL日志存储功能

#### 步骤1：更新配置文件结构
- 修改 `config/config.example.json`，添加MySQL日志存储配置项
- 配置项包括：`logStorage`（可选值：`file` 或 `mysql`）、`mysql` 连接信息

#### 步骤2：创建MySQL日志存储服务
- 创建 `lib/config/mysql-log-storage.ts` 文件
- 实现MySQL连接管理、表结构初始化（创建 `execution_logs` 表）
- 实现日志的CRUD操作：`saveLog`、`getJobLogs`、`getLogsByJob` 等方法

#### 步骤3：修改存储服务接口
- 修改 `lib/config/storage.ts`，添加日志存储策略选择逻辑
- 根据配置文件中的 `logStorage` 值，选择使用文件存储还是MySQL存储
- 保持接口一致性，确保现有代码无需修改

#### 步骤4：测试MySQL日志存储
- 编写测试用例，验证MySQL日志存储功能
- 测试配置切换功能，确保可以在文件存储和MySQL存储之间切换

### 2. 数据映射删除修复

#### 步骤1：分析当前删除逻辑
- 检查 `app/api/mappings/route.ts` 中的DELETE方法
- 检查 `lib/config/storage.ts` 中的 `deleteMapping` 函数

#### 步骤2：修复删除逻辑
- 确保删除数据映射时，同时删除相应的配置文件
- 添加错误处理和日志记录

#### 步骤3：测试删除功能
- 测试删除数据映射的功能，确保配置文件被正确删除
- 测试删除不存在的映射时的错误处理

### 3. GitHub Action优化

#### 步骤1：修改现有GitHub Action
- 修改 `.github/workflows/docker-build-push-amd64.yml` 文件
- 添加构建镜像tar包的步骤
- 添加将镜像tar包发布到GitHub Release的步骤

#### 步骤2：测试GitHub Action
- 测试GitHub Action的完整流程
- 确保镜像构建、推送和发布功能正常

## 技术要点

### MySQL日志存储
- 使用MySQL数据库存储同步作业日志，提高查询性能和可靠性
- 支持配置文件切换存储方式，保持向后兼容性
- 实现自动表结构初始化，简化部署

### 数据映射删除
- 确保删除操作的原子性，避免部分删除导致的问题
- 添加详细的错误处理和日志记录，便于排查问题

### GitHub Action
- 使用GitHub Actions的 `actions/upload-release-asset` 工具上传镜像tar包
- 确保版本号的正确提取和验证
- 优化构建流程，提高构建效率

## 验收标准

1. **MySQL日志存储功能**：
   - 配置文件中可以选择日志存储方式
   - 选择MySQL时，日志正确存储到MySQL数据库
   - 选择文件时，日志正确存储到文件系统
   - 日志查询功能正常工作

2. **数据映射删除修复**：
   - 删除数据映射后，配置文件被正确删除
   - 页面显示删除成功，实际操作也成功
   - 无错误日志产生

3. **GitHub Action优化**：
   - 发布到production分支时，自动触发docker构建
   - 构建为amd64架构的镜像，镜像标签为版本号
   - 镜像tar包被正确发布到GitHub Release中
   - 构建过程无错误

## 风险评估

1. **MySQL依赖**：新增MySQL依赖可能增加部署复杂度，需要在文档中说明配置方法。

2. **数据迁移**：从文件存储切换到MySQL存储时，需要考虑历史日志的迁移问题。

3. **GitHub Action权限**：需要确保GitHub Action有足够的权限上传release资产。

## 时间估计

- MySQL日志存储功能：2天
- 数据映射删除修复：0.5天
- GitHub Action优化：1天
- 测试和文档：0.5天

总计：4天