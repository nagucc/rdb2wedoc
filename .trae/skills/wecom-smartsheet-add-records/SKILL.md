---
name: "wecom-smartsheet-add-records"
description: "提供企业微信智能表格添加记录的正确操作方法，包括不同数据类型的处理格式。当需要与企业微信智能表格进行数据同步时调用。"
---

# 企业微信智能表格添加记录操作指南

## 概述

本skill提供了企业微信智能表格添加记录的正确操作方法，确保不同数据类型（数字、日期、文本等）都能按照企业微信API的要求正确处理。

## 适用场景

- 当需要向企业微信智能表格添加新记录时
- 当需要处理不同数据类型的字段同步时
- 当需要确保数据格式符合企业微信API要求时

## 核心代码实现

### 企业微信文档服务类

```typescript
import axios, { AxiosInstance } from 'axios';
import { WeComDocument, DocumentSheet, DocumentField, WeComAccount } from '@/types';
import { getWeComAccountById } from '@/lib/config/storage';
import { Logger } from '../utils/helpers';

export class WeComDocumentService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://qyapi.weixin.qq.com',
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getAccessToken(corpid: string, corpsecret: string): Promise<string> {
    try {
      const response = await this.client.get('/cgi-bin/gettoken', {
        params: {
          corpid,
          corpsecret
        }
      });

      if (response.data.errcode !== 0) {
        throw new Error(`获取access_token失败: ${response.data.errmsg}`);
      }

      return response.data.access_token;
    } catch (error) {
      Logger.error('获取企业微信access_token失败', { error: (error as Error).message });
      throw error;
    }
  }

  async writeSheetData(
    accessToken: string,
    documentId: string,
    sheetId: string,
    data: any[],
    fieldTypeMap?: Map<string, string>
  ): Promise<boolean> {
    try {
      const records = data.map(row => {
        const values: any = {};
        Object.keys(row).forEach(key => {
          const value = row[key];
          if (value !== null && value !== undefined) {
            // 根据目标字段类型设置正确的数据类型
            const fieldType = fieldTypeMap?.get(key);
            
            if (fieldType === 'number' || fieldType === 'currency' || fieldType === 'percentage') {
              // 数字类型直接使用数值
              values[key] = Number(value);
            } else if (fieldType === 'boolean') {
              // 布尔类型直接使用布尔值
              values[key] = Boolean(value);
            } else if (fieldType === 'datetime') {
              // 日期类型使用毫秒时间戳
              values[key] = new Date(value).getTime().toString();
            } else if (fieldType === 'text' || fieldType === 'url' || fieldType === 'phone' || fieldType === 'email' || fieldType === 'select' || fieldType === 'multi_select' || fieldType === 'user' || fieldType === 'group' || fieldType === 'location' || fieldType === 'formula' || fieldType === 'reference' || fieldType === 'barcode') {
              // 文本类型使用对象数组形式
              values[key] = [{
                type: 'text',
                text: String(value)
              }];
            } else {
              // 其他类型默认使用文本形式
              values[key] = [{
                type: 'text',
                text: String(value)
              }];
            }
          }
        });
        return { values };
      });

      const response = await this.client.post('/cgi-bin/wedoc/smartsheet/add_records', {
        docid: documentId,
        sheet_id: sheetId,
        key_type: 'CELL_VALUE_KEY_TYPE_FIELD_TITLE',
        records: records
      }, {
        params: {
          access_token: accessToken
        }
      });

      if (response.data.errcode !== 0) {
        throw new Error(`写入Sheet数据失败: ${response.data.errmsg}`);
      }

      return true;
    } catch (error) {
      Logger.error('写入Sheet数据失败', { error: (error as Error).message });
      throw error;
    }
  }

  async appendSheetData(
    accessToken: string,
    documentId: string,
    sheetId: string,
    data: any[],
    fieldTypeMap?: Map<string, string>
  ): Promise<boolean> {
    try {
      const records = data.map(row => {
        const values: any = {};
        Object.keys(row).forEach(key => {
          const value = row[key];
          if (value !== null && value !== undefined) {
            // 根据目标字段类型设置正确的数据类型
            const fieldType = fieldTypeMap?.get(key);
            
            if (fieldType === 'number' || fieldType === 'currency' || fieldType === 'percentage') {
              // 数字类型直接使用数值
              values[key] = Number(value);
            } else if (fieldType === 'boolean') {
              // 布尔类型直接使用布尔值
              values[key] = Boolean(value);
            } else if (fieldType === 'datetime') {
              // 日期类型使用毫秒时间戳
              values[key] = new Date(value).getTime().toString();
            } else if (fieldType === 'text' || fieldType === 'url' || fieldType === 'phone' || fieldType === 'email' || fieldType === 'select' || fieldType === 'multi_select' || fieldType === 'user' || fieldType === 'group' || fieldType === 'location' || fieldType === 'formula' || fieldType === 'reference' || fieldType === 'barcode') {
              // 文本类型使用对象数组形式
              values[key] = [{
                type: 'text',
                text: String(value)
              }];
            } else {
              // 其他类型默认使用文本形式
              values[key] = [{
                type: 'text',
                text: String(value)
              }];
            }
          }
        });
        return { values };
      });

      const response = await this.client.post('/cgi-bin/wedoc/smartsheet/add_records', {
        docid: documentId,
        sheet_id: sheetId,
        key_type: 'CELL_VALUE_KEY_TYPE_FIELD_TITLE',
        records: records
      }, {
        params: {
          access_token: accessToken
        }
      });

      if (response.data.errcode !== 0) {
        throw new Error(`追加Sheet数据失败: ${response.data.errmsg}`);
      }

      return true;
    } catch (error) {
      Logger.error('追加Sheet数据失败', { error: (error as Error).message });
      throw error;
    }
  }

  // 其他方法...
}

// 单例模式
export const weComDocumentService = new WeComDocumentService();
```

### 字段类型映射

```typescript
private mapFieldType(fieldType: string): string {
  const typeMap: Record<string, string> = {
    'FIELD_TYPE_TEXT': 'text',
    'FIELD_TYPE_NUMBER': 'number',
    'FIELD_TYPE_CHECKBOX': 'boolean',
    'FIELD_TYPE_DATE_TIME': 'datetime',
    'FIELD_TYPE_IMAGE': 'image',
    'FIELD_TYPE_ATTACHMENT': 'file',
    'FIELD_TYPE_USER': 'user',
    'FIELD_TYPE_URL': 'url',
    'FIELD_TYPE_SELECT': 'multi_select',
    'FIELD_TYPE_CREATED_USER': 'user',
    'FIELD_TYPE_MODIFIED_USER': 'user',
    'FIELD_TYPE_CREATED_TIME': 'datetime',
    'FIELD_TYPE_MODIFIED_TIME': 'datetime',
    'FIELD_TYPE_PROGRESS': 'number',
    'FIELD_TYPE_PHONE_NUMBER': 'phone',
    'FIELD_TYPE_EMAIL': 'email',
    'FIELD_TYPE_SINGLE_SELECT': 'select',
    'FIELD_TYPE_REFERENCE': 'reference',
    'FIELD_TYPE_LOCATION': 'location',
    'FIELD_TYPE_FORMULA': 'formula',
    'FIELD_TYPE_CURRENCY': 'currency',
    'FIELD_TYPE_WWGROUP': 'group',
    'FIELD_TYPE_AUTONUMBER': 'number',
    'FIELD_TYPE_PERCENTAGE': 'number',
    'FIELD_TYPE_BARCODE': 'text'
  };
  
  return typeMap[fieldType] || 'text';
}
```

## 数据类型处理规则

| 字段类型 | 处理方式 | 示例 |
|---------|---------|------|
| number, currency, percentage | 直接使用数值 | `123.45` |
| boolean | 直接使用布尔值 | `true` |
| datetime | 使用毫秒时间戳字符串 | `1674835200000` |
| text, url, phone, email, select, multi_select, user, group, location, formula, reference, barcode | 使用对象数组形式 | `[{ type: 'text', text: 'Hello' }]` |
| 其他类型 | 默认使用文本形式 | `[{ type: 'text', text: 'Other' }]` |

## 使用示例

### 基本用法

```typescript
import { weComDocumentService } from '@/lib/services/wecom-document.service';

// 获取access token
const accessToken = await weComDocumentService.getAccessToken(corpId, corpSecret);

// 准备数据
const data = [
  {
    '姓名': '张三',
    '年龄': 25,
    '入职日期': '2023-01-01',
    '是否在职': true,
    '邮箱': 'zhangsan@example.com'
  },
  {
    '姓名': '李四',
    '年龄': 30,
    '入职日期': '2022-06-01',
    '是否在职': true,
    '邮箱': 'lisi@example.com'
  }
];

// 准备字段类型映射
const fieldTypeMap = new Map<string, string>();
fieldTypeMap.set('姓名', 'text');
fieldTypeMap.set('年龄', 'number');
fieldTypeMap.set('入职日期', 'datetime');
fieldTypeMap.set('是否在职', 'boolean');
fieldTypeMap.set('邮箱', 'email');

// 写入数据
await weComDocumentService.writeSheetData(
  accessToken,
  documentId,
  sheetId,
  data,
  fieldTypeMap
);
```

### 从同步服务中调用

```typescript
private async overwriteToDocument(document: WeComDocument, sheetId: string, data: any[], fieldTypeMap?: Map<string, string>): Promise<void> {
  const account = getWeComAccountById(document.accountId);
  if (!account) {
    throw new Error(`关联的企业微信账号不存在，accountId: ${document.accountId}`);
  }

  const accessToken = await weComDocumentService.getAccessToken(account.corpId, account.corpSecret);
  if (!accessToken) {
    throw new Error(`获取企业微信access token失败, corpId: ${account.corpId}`);
  }
  await weComDocumentService.clearSheetData(accessToken, document.id, sheetId);
  await weComDocumentService.writeSheetData(accessToken, document.id, sheetId, data, fieldTypeMap);
}

private async appendToDocument(document: WeComDocument, sheetId: string, data: any[], fieldTypeMap?: Map<string, string>): Promise<void> {
  const account = getWeComAccountById(document.accountId);
  if (!account) {
    throw new Error(`关联的企业微信账号不存在，accountId: ${document.accountId}`);
  }

  const accessToken = await weComDocumentService.getAccessToken(account.corpId, account.corpSecret);
  if (!accessToken) {
    throw new Error(`获取企业微信access token失败, corpId: ${account.corpId}`);
  }
  await weComDocumentService.appendSheetData(accessToken, document.id, sheetId, data, fieldTypeMap);
}
```

## 注意事项

1. **字段类型映射**：确保正确获取目标表格的字段类型，并使用`fieldTypeMap`传递给写入方法。

2. **空值处理**：代码会自动跳过`null`和`undefined`值，避免向智能表格写入空值。

3. **日期处理**：日期类型需要转换为毫秒时间戳字符串，确保企业微信能正确识别。

4. **文本类型**：文本类型必须使用对象数组形式`[{ type: 'text', text: 'value' }]`，这是企业微信API的要求。

5. **数字类型**：数字类型直接使用数值，不需要转换为字符串。

6. **布尔类型**：布尔类型直接使用布尔值，不需要转换。

7. **API参数**：使用`add_records`接口时，需要设置`key_type: 'CELL_VALUE_KEY_TYPE_FIELD_TITLE'`，表示使用字段标题作为键。

8. **错误处理**：添加适当的错误处理，捕获并记录API调用失败的情况。

## 故障排查

### 常见问题

1. **文本字段同步失败**：检查是否使用了正确的对象数组形式。

2. **日期字段显示不正确**：确保日期值已转换为毫秒时间戳字符串。

3. **数字字段不显示**：检查是否直接使用了数值，而不是字符串。

4. **API调用失败**：检查access token是否有效，文档和表格ID是否正确。

### 调试建议

1. 打印请求数据，确保数据格式符合要求。
2. 检查API响应，了解具体的错误信息。
3. 验证字段类型映射是否正确。
4. 测试单个字段的同步，定位问题所在。

## 参考文档

- [企业微信开发者文档 - 智能表格](https://developer.work.weixin.qq.com/document/path/99907)
- [企业微信开发者文档 - 添加记录](https://developer.work.weixin.qq.com/document/path/99907#添加记录)

## 最佳实践

1. **预获取字段类型**：在同步前先获取目标表格的字段类型，确保数据类型处理正确。

2. **批量操作**：对于大量数据，使用批量添加接口，减少API调用次数。

3. **错误重试**：添加错误重试机制，提高同步的可靠性。

4. **日志记录**：记录同步过程中的关键信息和错误，便于排查问题。

5. **数据验证**：在同步前验证数据格式，确保数据符合目标字段的要求。

6. **类型转换**：根据目标字段类型自动转换数据格式，提高同步的准确性。

7. **边界情况处理**：处理空值、特殊字符等边界情况，确保同步过程稳定。

8. **性能优化**：对于大数据量的同步，考虑分批处理，避免超时或内存溢出。