import { databaseService } from './database.service';
import { weComDocumentService } from './wecom-document.service';
import { getDatabaseById, getDocumentById } from '@/lib/config/storage';
import { Logger } from '@/lib/utils/helpers';

export interface DatabaseField {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: any;
}

export interface DocumentField {
  name: string;
  type: string;
  description?: string;
}

export interface FieldMapping {
  databaseField: string;
  documentField: string;
  transform?: string;
  required?: boolean;
}

export interface MappingPreview {
  databaseFields: DatabaseField[];
  documentFields: DocumentField[];
  mappings: FieldMapping[];
  sampleData: any[];
}

/**
 * 字段映射服务
 * 负责管理数据库字段与企业微信文档字段的映射关系
 */
export class FieldMappingService {
  private static instance: FieldMappingService;

  private constructor() {}

  static getInstance(): FieldMappingService {
    if (!FieldMappingService.instance) {
      FieldMappingService.instance = new FieldMappingService();
    }
    return FieldMappingService.instance;
  }

  /**
   * 获取数据库表的字段信息
   */
  async getDatabaseFields(
    databaseId: string,
    tableName: string
  ): Promise<DatabaseField[]> {
    try {
      const database = await getDatabaseById(databaseId);
      if (!database) {
        throw new Error('数据源不存在');
      }

      // 获取表结构
      const tableStructure = await databaseService.getTableStructure(
        database,
        tableName
      );

      return tableStructure.map((column: any) => ({
        name: column.name,
        type: column.type,
        nullable: column.nullable,
        primaryKey: column.primaryKey,
        defaultValue: column.defaultValue
      }));
    } catch (error) {
      Logger.error('获取数据库字段失败', {
        databaseId,
        tableName,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * 获取企业微信文档Sheet的字段信息
   */
  async getDocumentFields(
    documentId: string,
    sheetId: string
  ): Promise<DocumentField[]> {
    try {
      const document = await getDocumentById(documentId);
      if (!document) {
        throw new Error('文档不存在');
      }

      // 获取Sheet字段
      const fields = await weComDocumentService.getSheetFields(
        document.documentId,
        sheetId
      );

      return fields.map((field: any) => ({
        name: field.name,
        type: field.type,
        description: field.description
      }));
    } catch (error) {
      Logger.error('获取文档字段失败', {
        documentId,
        sheetId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * 智能推荐字段映射
   * 根据字段名称和类型自动推荐映射关系
   */
  async suggestFieldMappings(
    databaseFields: DatabaseField[],
    documentFields: DocumentField[]
  ): Promise<FieldMapping[]> {
    const mappings: FieldMapping[] = [];

    for (const dbField of databaseFields) {
      // 查找最匹配的文档字段
      const matchedDocField = this.findBestMatch(dbField, documentFields);

      if (matchedDocField) {
        mappings.push({
          databaseField: dbField.name,
          documentField: matchedDocField.name,
          required: dbField.primaryKey || !dbField.nullable
        });
      }
    }

    return mappings;
  }

  /**
   * 查找最佳匹配的文档字段
   */
  private findBestMatch(
    dbField: DatabaseField,
    documentFields: DocumentField[]
  ): DocumentField | null {
    let bestMatch: DocumentField | null = null;
    let bestScore = 0;

    for (const docField of documentFields) {
      const score = this.calculateMatchScore(dbField, docField);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = docField;
      }
    }

    // 只有当匹配分数大于阈值时才返回
    return bestScore > 0.5 ? bestMatch : null;
  }

  /**
   * 计算字段匹配分数
   */
  private calculateMatchScore(
    dbField: DatabaseField,
    docField: DocumentField
  ): number {
    let score = 0;

    // 字段名称相似度（简单实现）
    const dbName = dbField.name.toLowerCase();
    const docName = docField.name.toLowerCase();

    if (dbName === docName) {
      score += 1.0;
    } else if (dbName.includes(docName) || docName.includes(dbName)) {
      score += 0.7;
    } else {
      // 检查驼峰转下划线等常见转换
      const dbCamel = dbName.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const docCamel = docName.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (dbCamel === docCamel) {
        score += 0.8;
      }
    }

    // 类型匹配
    if (this.isTypeCompatible(dbField.type, docField.type)) {
      score += 0.3;
    }

    return score;
  }

  /**
   * 检查类型是否兼容
   */
  private isTypeCompatible(dbType: string, docType: string): boolean {
    const dbTypeLower = dbType.toLowerCase();
    const docTypeLower = docType.toLowerCase();

    // 数字类型
    if (dbTypeLower.includes('int') || dbTypeLower.includes('decimal') || dbTypeLower.includes('number')) {
      return docTypeLower.includes('number');
    }

    // 字符串类型
    if (dbTypeLower.includes('char') || dbTypeLower.includes('text') || dbTypeLower.includes('varchar')) {
      return docTypeLower.includes('string') || docTypeLower.includes('text');
    }

    // 日期类型
    if (dbTypeLower.includes('date') || dbTypeLower.includes('time')) {
      return docTypeLower.includes('date') || docTypeLower.includes('time');
    }

    // 布尔类型
    if (dbTypeLower.includes('bool')) {
      return docTypeLower.includes('bool');
    }

    return false;
  }

  /**
   * 验证字段映射配置
   */
  validateFieldMappings(
    mappings: FieldMapping[],
    databaseFields: DatabaseField[],
    documentFields: DocumentField[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查必填字段是否都有映射
    for (const dbField of databaseFields) {
      if (dbField.primaryKey || !dbField.nullable) {
        const hasMapping = mappings.some(m => m.databaseField === dbField.name);
        if (!hasMapping) {
          errors.push(`必填字段 ${dbField.name} 未映射`);
        }
      }
    }

    // 检查映射的字段是否存在
    for (const mapping of mappings) {
      const dbFieldExists = databaseFields.some(f => f.name === mapping.databaseField);
      const docFieldExists = documentFields.some(f => f.name === mapping.documentField);

      if (!dbFieldExists) {
        errors.push(`数据库字段 ${mapping.databaseField} 不存在`);
      }
      if (!docFieldExists) {
        errors.push(`文档字段 ${mapping.documentField} 不存在`);
      }
    }

    // 检查是否有重复映射
    const docFieldCount = new Map<string, number>();
    for (const mapping of mappings) {
      const count = docFieldCount.get(mapping.documentField) || 0;
      docFieldCount.set(mapping.documentField, count + 1);
    }

    for (const [field, count] of docFieldCount) {
      if (count > 1) {
        errors.push(`文档字段 ${field} 被映射了 ${count} 次`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取映射预览
   */
  async getMappingPreview(
    databaseId: string,
    documentId: string,
    tableName: string,
    sheetId: string,
    mappings: FieldMapping[],
    limit: number = 10
  ): Promise<MappingPreview> {
    try {
      // 获取数据库字段
      const databaseFields = await this.getDatabaseFields(databaseId, tableName);

      // 获取文档字段
      const documentFields = await this.getDocumentFields(documentId, sheetId);

      // 获取样本数据
      const database = await getDatabaseById(databaseId);
      const sampleData = await databaseService.query(
        database,
        `SELECT * FROM ${tableName} LIMIT ${limit}`
      );

      // 转换数据
      const transformedData = sampleData.map(row => {
        const transformed: any = {};
        for (const mapping of mappings) {
          transformed[mapping.documentField] = row[mapping.databaseField];
        }
        return transformed;
      });

      return {
        databaseFields,
        documentFields,
        mappings,
        sampleData: transformedData
      };
    } catch (error) {
      Logger.error('获取映射预览失败', {
        databaseId,
        documentId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * 应用数据转换
   */
  applyTransform(value: any, transform: string): any {
    const transforms: Record<string, (val: any) => any> = {
      'toString': (val) => String(val),
      'toNumber': (val) => Number(val),
      'toUpperCase': (val) => String(val).toUpperCase(),
      'toLowerCase': (val) => String(val).toLowerCase(),
      'trim': (val) => String(val).trim(),
      'toDate': (val) => new Date(val).toISOString(),
      'toBoolean': (val) => Boolean(val),
      'toFixed': (val, decimals = 2) => Number(val).toFixed(decimals),
      'toDateString': (val) => new Date(val).toLocaleDateString(),
      'toDateTimeString': (val) => new Date(val).toLocaleString()
    };

    const transformFn = transforms[transform];
    if (transformFn) {
      return transformFn(value);
    }

    return value;
  }
}

// 导出单例
export const fieldMappingService = FieldMappingService.getInstance();
