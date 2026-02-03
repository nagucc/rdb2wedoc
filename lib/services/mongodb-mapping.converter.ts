import { MongoDBMappingType } from '@/types';
import { Logger } from '@/lib/utils/helpers';

interface FlattenedDocument {
  [key: string]: any;
}

export class MongoDBMappingConverter {
  private static instance: MongoDBMappingConverter;

  private constructor() {}

  static getInstance(): MongoDBMappingConverter {
    if (!MongoDBMappingConverter.instance) {
      MongoDBMappingConverter.instance = new MongoDBMappingConverter();
    }
    return MongoDBMappingConverter.instance;
  }

  flattenDocument(doc: any): FlattenedDocument {
    if (!doc || typeof doc !== 'object') {
      return {};
    }

    const result: FlattenedDocument = {};
    this.extractFields('', doc, result);
    return result;
  }

  private extractFields(prefix: string, obj: any, result: FlattenedDocument): void {
    if (obj === null || obj === undefined) {
      return;
    }

    if (Array.isArray(obj)) {
      result[prefix] = JSON.stringify(obj);
      return;
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (value === null || value === undefined) {
          result[newKey] = null;
        } else if (Array.isArray(value)) {
          result[newKey] = JSON.stringify(value);
        } else if (typeof value === 'object') {
          this.extractFields(newKey, value, result);
        } else {
          result[newKey] = value;
        }
      }
    } else {
      result[prefix] = obj;
    }
  }

  expandArray(doc: any, arrayFieldPath: string): any[] {
    if (!doc || !arrayFieldPath) {
      return [];
    }

    const arrayValue = this.getNestedValue(doc, arrayFieldPath);
    if (!Array.isArray(arrayValue)) {
      Logger.warn(`字段 ${arrayFieldPath} 不是数组类型`);
      return [];
    }

    const idField = this.getNestedValue(doc, '_id');

    return arrayValue.map((item, index) => {
      const expandedRow: any = {
        _id: idField,
        [`${arrayFieldPath.replace('[]', '_item')}`]: item
      };
      return expandedRow;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    if (!path || !obj) {
      return undefined;
    }

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (part === '[]') {
        if (Array.isArray(current)) {
          return current;
        }
        return undefined;
      }

      current = current[part];
    }

    return current;
  }

  transformDocuments(
    documents: any[],
    mongoMappingType: MongoDBMappingType,
    mongoArrayField?: string
  ): any[] {
    if (!documents || documents.length === 0) {
      return [];
    }

    if (mongoMappingType === 'array_expand' && mongoArrayField) {
      const expandedDocs: any[] = [];
      for (const doc of documents) {
        const expanded = this.expandArray(doc, mongoArrayField);
        expandedDocs.push(...expanded);
      }
      return expandedDocs;
    }

    return documents.map(doc => this.flattenDocument(doc));
  }

  convertFieldValue(value: any, targetType: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (targetType.toLowerCase()) {
      case 'number':
        if (typeof value === 'number') {
          return value;
        }
        const num = Number(value);
        return isNaN(num) ? null : num;

      case 'boolean':
        if (typeof value === 'boolean') {
          return value;
        }
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);

      case 'date':
        if (value instanceof Date) {
          return value;
        }
        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date;
        }
        return null;

      case 'json':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;

      case 'string':
      default:
        if (typeof value === 'string') {
          return value;
        }
        return String(value);
    }
  }
}

export const mongoDBMappingConverter = MongoDBMappingConverter.getInstance();
