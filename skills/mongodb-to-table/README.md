# MongoDB to 2D Table Mapping Skill

一个通用的、可复用的 MongoDB 文档到二维表转换模块。支持展平映射和数组展开两种模式，提供完整的类型安全和错误处理机制。

## 功能特性

- **展平映射模式 (flatten)**: 将嵌套文档展平为顶层字段，数组自动转为 JSON 字符串
- **数组展开模式 (array_expand)**: 将数组的每个元素展开为单独一行，保留文档 ID 作为关联字段
- **与 MongoDB $unwind 聚合兼容**: 数组展开后使用点号分隔符访问嵌套字段，如 `comments.user`
- **自定义字段映射**: 支持灵活的字段映射规则和数据类型转换
- **多种导出格式**: 支持 CSV、JSON、数组格式导出
- **完整的错误处理**: 详细的错误收集和验证机制
- **TypeScript 支持**: 完整的类型定义，开箱即用

## 与 MongoDB $unwind 聚合的兼容性

本模块设计为与 MongoDB 的 `$unwind` 聚合操作配合使用。在数组展开模式下：

1. 模块会模拟 MongoDB `$unwind` 的行为，将数组元素展开
2. 展开后的嵌套对象字段使用点号分隔符访问，如 `comments.user`
3. 这种方式与在 MongoDB 中使用 `$unwind` 后直接访问字段的方式一致

示例流程：
```typescript
// 原始 MongoDB 数据
{ _id: 1, comments: [{ user: 'Alice', text: 'Great!' }] }

// 经过 $unwind 后 (本模块模拟的行为)
{ _id: 1, comments: { user: 'Alice', text: 'Great!' } }

// 字段映射配置
{ databaseField: 'comments.user', documentField: 'comment_user' }
```

## 安装

```bash
npm install mongodb-to-table
# 或
yarn add mongodb-to-table
# 或
pnpm add mongodb-to-table
```

## 快速开始

### 基本用法

```typescript
import { createMapper, mapMongoDBToTable, exportToCSV } from 'mongodb-to-table';

// MongoDB 文档数据
const documents = [
  { _id: 1, name: 'John', tags: ['admin', 'developer'] },
  { _id: 2, name: 'Jane', tags: ['designer', 'manager'] }
];

// 创建映射器
const mapper = createMapper({
  mongoMappingType: 'flatten',
  fieldMappings: [
    { databaseField: '_id', documentField: 'id' },
    { databaseField: 'name', documentField: 'name' },
    { databaseField: 'tags', documentField: 'tags_json' }
  ]
});

// 执行映射
const tableData = mapper.map(documents);
console.log(tableData);
// 输出:
// {
//   columns: [ {name: 'id', type: 'number'}, {name: 'name', type: 'string'}, ... ],
//   rows: [ {id: 1, name: 'John', tags_json: '["admin","developer"]'}, ... ],
//   metadata: { totalRows: 2, totalColumns: 3, ... }
// }

// 导出为 CSV
const csv = mapper.export(tableData, { format: 'csv' });
console.log(csv);
```

### 使用快速映射 API

```typescript
import { quickMap, quickExport } from 'mongodb-to-table';

const documents = [
  { _id: 1, user: { name: 'John', age: 30 }, scores: [85, 90, 78] },
  { _id: 2, user: { name: 'Jane', age: 25 }, scores: [92, 88, 95] }
];

// 一行代码完成映射
const tableData = quickMap(documents, {
  mongoMappingType: 'flatten',
  fieldMappings: [
    { databaseField: '_id', documentField: 'id' },
    { databaseField: 'user.name', documentField: 'user_name' },
    { databaseField: 'user.age', documentField: 'age' }
  ]
});

// 一行代码导出 CSV
const csv = quickExport(tableData, 'csv');
```

## 映射配置

### MappingConfig 接口

```typescript
interface MappingConfig {
  // 映射模式: 'flatten' | 'array_expand'
  mongoMappingType: 'flatten' | 'array_expand';
  
  // 数组展开模式下需要展开的字段名
  mongoArrayField?: string;
  
  // 字段映射配置
  fieldMappings: FieldMapping[];
  
  // 附加选项
  options?: MappingOptions;
}
```

### FieldMapping 接口

```typescript
interface FieldMapping {
  // MongoDB 文档中的字段路径 (支持嵌套，如 'user.name' 或 'comments.user')
  // 在数组展开模式下，使用点号分隔符，如 'comments.user' 而不是 'comments[].user'
  databaseField: string;
  
  // 目标表的列名
  documentField: string;
  
  // 数据转换规则 (可选)
  transform?: TransformRule;
  
  // 是否为必填字段 (默认为 false)
  required?: boolean;
  
  // 默认值 (当字段缺失时使用)
  defaultValue?: any;
}
```

### TransformRule 接口

```typescript
interface TransformRule {
  // 转换类型
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'custom';
  
  // 日期格式 (当 type 为 'date' 时使用)
  format?: 'ISO' | 'date' | 'datetime' | 'unix' | 'timestamp';
  
  // 自定义转换函数 (当 type 为 'custom' 时使用)
  customTransform?: (value: any) => any;
}
```

### MappingOptions 接口

```typescript
interface MappingOptions {
  // 是否包含所有字段 (不进行字段过滤)
  includeAllFields?: boolean;
  
  // 要排除的字段列表
  excludeFields?: string[];
  
  // 嵌套展开的最大深度 (默认为 10)
  maxDepth?: number;
  
  // 日期格式
  dateFormat?: string;
  
  // null 值的替换字符串
  nullValue?: string;
  
  // 数组元素分隔符 (用于数组转字符串)
  arraySeparator?: string;
  
  // 是否跳过无效行 (默认为 true)
  skipInvalidRows?: boolean;
  
  // 是否保留 buffer 字段 (默认为 false)
  preserveBufferFields?: boolean;
}
```

## 使用示例

### 示例 1: 展平映射 (Flatten Mode)

将嵌套文档展平，数组转为 JSON 字符串：

```typescript
import { createMapper } from 'mongodb-to-table';

const documents = [
  {
    _id: 1,
    user: {
      profile: {
        name: 'John',
        email: 'john@example.com'
      },
      tags: ['admin', 'developer'],
      metadata: {
        created_at: new Date('2024-01-15'),
        score: 95.5
      }
    }
  }
];

const mapper = createMapper({
  mongoMappingType: 'flatten',
  fieldMappings: [
    { databaseField: '_id', documentField: 'id' },
    { databaseField: 'user.profile.name', documentField: 'user_name' },
    { databaseField: 'user.profile.email', documentField: 'email' },
    { databaseField: 'user.tags', documentField: 'tags' },
    { 
      databaseField: 'user.metadata.created_at', 
      documentField: 'created_date',
      transform: { type: 'date', format: 'date' }
    }
  ]
});

const result = mapper.map(documents);
console.log(result.rows[0]);
// 输出:
// {
//   id: 1,
//   user_name: 'John',
//   email: 'john@example.com',
//   tags: '["admin","developer"]',
//   created_date: '2024-01-15'
// }
```

### 示例 2: 数组展开 (Array Expand Mode)

将数组的每个元素展开为单独的一行：

```typescript
import { createMapper } from 'mongodb-to-table';

const documents = [
  {
    _id: 'doc1',
    title: 'First Post',
    comments: [
      { user: 'Alice', text: 'Great!', likes: 10 },
      { user: 'Bob', text: 'Nice work!', likes: 5 }
    ]
  },
  {
    _id: 'doc2',
    title: 'Second Post',
    comments: [
      { user: 'Charlie', text: 'Thanks!', likes: 8 }
    ]
  }
];

const mapper = createMapper({
  mongoMappingType: 'array_expand',
  mongoArrayField: 'comments',
  fieldMappings: [
    { databaseField: '_id', documentField: 'post_id' },
    { databaseField: 'title', documentField: 'post_title' },
    { databaseField: 'comments.user', documentField: 'comment_user' },
    { databaseField: 'comments.text', documentField: 'comment_text' },
    { databaseField: 'comments.likes', documentField: 'comment_likes' }
  ]
});

const result = mapper.map(documents);
console.log(result.rows);
// 输出:
// [
//   { post_id: 'doc1', post_title: 'First Post', comment_user: 'Alice', comment_text: 'Great!', comment_likes: 10 },
//   { post_id: 'doc1', post_title: 'First Post', comment_user: 'Bob', comment_text: 'Nice work!', comment_likes: 5 },
//   { post_id: 'doc2', post_title: 'Second Post', comment_user: 'Charlie', comment_text: 'Thanks!', comment_likes: 8 }
// ]
```

### 示例 3: 数据类型转换

使用 transform 进行数据类型转换：

```typescript
import { createMapper } from 'mongodb-to-table';

const documents = [
  { _id: 1, price: '29.99', active: 'true', date: '2024-03-15' },
  { _id: 2, price: '49.99', active: 'false', date: '2024-03-16' }
];

const mapper = createMapper({
  mongoMappingType: 'flatten',
  fieldMappings: [
    { databaseField: '_id', documentField: 'id' },
    { 
      databaseField: 'price', 
      documentField: 'price_number',
      transform: { type: 'number' }
    },
    { 
      databaseField: 'active', 
      documentField: 'is_active',
      transform: { type: 'boolean' }
    },
    { 
      databaseField: 'date', 
      documentField: 'formatted_date',
      transform: { type: 'date', format: 'datetime' }
    }
  ]
});

const result = mapper.map(documents);
console.log(result.rows[0]);
// 输出:
// {
//   id: 1,
//   price_number: 29.99,
//   is_active: true,
//   formatted_date: '2024-03-15 00:00:00'
// }
```

### 示例 4: 包含所有字段

使用 `includeAllFields` 选项包含所有字段：

```typescript
const mapper = createMapper({
  mongoMappingType: 'flatten',
  fieldMappings: [],
  options: {
    includeAllFields: true,
    excludeFields: ['password', 'secret'],
    maxDepth: 5
  }
});

const result = mapper.map(documents);
// result.rows 将包含文档的所有字段（除了 password 和 secret）
```

## 导出功能

### 导出为 CSV

```typescript
import { createMapper, exportToCSV } from 'mongodb-to-table';

const csv = exportToCSV(tableData, { format: 'csv' });
// 或使用 mapper 实例
const csv = mapper.export(tableData, { format: 'csv' });
```

### 导出为 JSON

```typescript
import { exportToJSON } from 'mongodb-to-table';

const json = exportToJSON(tableData);
// 输出格式:
// {
//   "metadata": { ... },
//   "columns": [ ... ],
//   "data": [ ... ]
// }
```

### 导出为数组 (用于 Excel)

```typescript
import { exportToArray } from 'mongodb-to-table';

const array = exportToArray(tableData);
// 输出格式:
// [[列名1, 列名2, ...], [值1, 值2, ...], ...]
```

### 保存到文件

```typescript
mapper.export(tableData, { format: 'csv' });
mapper.exportToFile(tableData, 'output.csv');
```

## 错误处理

```typescript
import { createMapper, ValidationError, ConfigurationError } from 'mongodb-to-table';

try {
  const mapper = createMapper(config);
  const result = mapper.map(documents);
  
  // 检查是否有非致命错误
  if (mapper.hasErrors()) {
    const errors = mapper.getErrors();
    console.warn('Mapping completed with errors:', errors);
  }
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('配置错误:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('验证错误:', error.message, error.field);
  } else {
    console.error('未知错误:', error);
  }
}
```

## API 参考

### 核心函数

| 函数 | 描述 |
|------|------|
| `createMapper(config)` | 创建映射器实例 |
| `mapMongoDBToTable(documents, config)` | 直接执行映射 (便捷函数) |
| `quickMap(documents, options)` | 快速映射 (一行代码) |
| `quickExport(data, format, options)` | 快速导出 |

### 映射器方法

| 方法 | 描述 |
|------|------|
| `map(documents)` | 执行映射转换 |
| `export(data, options)` | 导出数据 |
| `exportToFile(data, filePath)` | 导出到文件 |
| `getStats()` | 获取处理统计信息 |
| `hasErrors()` | 检查是否有错误 |
| `getErrors()` | 获取错误列表 |

### TableData 接口

```typescript
interface TableData {
  columns: TableColumn[];
  rows: Record<string, any>[];
  metadata: {
    totalRows: number;
    totalColumns: number;
    mappingType: 'flatten' | 'array_expand';
    sourceCollection: string;
    generatedAt: string;
  };
}
```

## 浏览器环境

该模块也支持在浏览器环境中使用：

```html
<script type=" *module">
  import as MongoDBToTable from './dist/index.mjs';
  
  const mapper = MongoDBToTable.createMapper({
    mongoMappingType: 'flatten',
    fieldMappings: [...]
  });
  
  const result = mapper.map(documents);
  console.log(result);
</script>
```

## 性能建议

1. **大数据集**: 使用 `skipInvalidRows: true` 选项提高处理效率
2. **内存优化**: 分批处理大量数据
3. **导出大文件**: 使用流式导出 (TODO: 后续版本支持)

## 扩展与定制

### 自定义转换器

```typescript
const mapper = createMapper({
  mongoMappingType: 'flatten',
  fieldMappings: [
    {
      databaseField: 'custom_field',
      documentField: 'processed_field',
      transform: {
        type: 'custom',
        customTransform: (value) => {
          // 自定义转换逻辑
          return value.toUpperCase();
        }
      }
    }
  ]
});
```

### 自定义导出器

```typescript
import { BaseExporter } from 'mongodb-to-table';

class CustomExporter extends BaseExporter {
  export(data) {
    // 自定义导出逻辑
    return customFormatString;
  }
}
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
