/**
 * MongoDB to 2D Table Mapping Skill - Data Type Transformers
 * 
 * Provides comprehensive data transformation and type conversion utilities.
 */

import { TransformRule } from './types';
import { TransformationError } from './errors';

export interface TransformContext {
  documentId?: string;
  fieldPath?: string;
}

export const builtInTransformers: Record<string, (value: any, rule?: TransformRule) => any> = {
  string: (value: any) => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  },

  number: (value: any) => {
    if (value === null || value === undefined) {
      return NaN;
    }
    const num = Number(value);
    if (isNaN(num)) {
      return NaN;
    }
    return num;
  },

  boolean: (value: any) => {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return Boolean(value);
  },

  date: (value: any, rule?: TransformRule) => {
    if (value === null || value === undefined) {
      return null;
    }
    const format = rule?.format || 'ISO';
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return null;
    }
    switch (format) {
      case 'ISO':
        return date.toISOString();
      case 'unix':
        return Math.floor(date.getTime() / 1000);
      case 'date':
        return date.toISOString().split('T')[0];
      case 'datetime':
        return date.toISOString().slice(0, 19).replace('T', ' ');
      case 'timestamp':
        return date.toISOString();
      default:
        return date.toISOString();
    }
  },

  array: (value: any, rule?: TransformRule) => {
    if (value === null || value === undefined) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    const separator = rule?.format || ',';
    if (typeof value === 'string') {
      return value.split(separator).map((item: string) => item.trim());
    }
    return [value];
  },

  object: (value: any) => {
    if (value === null || value === undefined) {
      return {};
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
    return { value };
  }
};

export function transformValue(
  value: any,
  rule?: TransformRule,
  context?: TransformContext
): any {
  if (value === null || value === undefined) {
    return null;
  }

  if (!rule) {
    return value;
  }

  try {
    if (rule.type === 'custom' && rule.customTransform) {
      return rule.customTransform(value);
    }

    const transformer = builtInTransformers[rule.type];
    if (!transformer) {
      throw new TransformationError(
        `Unknown transform type: ${rule.type}`,
        context?.fieldPath || 'unknown',
        value,
        context?.documentId
      );
    }

    return transformer(value, rule);
  } catch (error) {
    if (error instanceof TransformationError) {
      throw error;
    }
    throw new TransformationError(
      (error as Error).message,
      context?.fieldPath || 'unknown',
      value,
      context?.documentId
    );
  }
}

export function transformObject(
  obj: Record<string, any>,
  fieldMappings: Array<{
    databaseField: string;
    documentField: string;
    transform?: TransformRule;
    required?: boolean;
    defaultValue?: any;
  }>,
  options?: {
    nullValue?: string;
    dateFormat?: string;
  }
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const mapping of fieldMappings) {
    let value = getNestedValue(obj, mapping.databaseField);
    
    if (value === undefined && mapping.databaseField.includes('.')) {
      value = obj[mapping.databaseField];
    }
    
    let transformedValue: any;

    if (value !== undefined) {
      transformedValue = transformValue(value, mapping.transform, {
        fieldPath: mapping.databaseField
      });
    } else if (mapping.defaultValue !== undefined) {
      transformedValue = mapping.defaultValue;
    } else if (mapping.required) {
      throw new TransformationError(
        `Required field "${mapping.databaseField}" is missing`,
        mapping.databaseField,
        obj
      );
    }

    if (transformedValue === null && options?.nullValue !== undefined) {
      transformedValue = options.nullValue;
    }

    result[mapping.documentField] = transformedValue;
  }

  return result;
}

export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) {
    return undefined;
  }

  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (current instanceof Map) {
      current = current.get(key);
    } else if (Array.isArray(current) && key === '[]') {
      current = current;
    } else {
      current = current[key];
    }
  }

  return current;
}

export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

export function flattenObject(
  obj: Record<string, any>,
  prefix: string = '',
  maxDepth: number = 10,
  currentDepth: number = 0
): Record<string, any> {
  if (currentDepth > maxDepth) {
    const result: Record<string, any> = {};
    result[prefix] = obj;
    return result;
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result[newKey] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey, maxDepth, currentDepth + 1));
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        result[newKey] = [];
      } else {
        const firstItem = value[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          for (let i = 0; i < value.length; i++) {
            Object.assign(
              result,
              flattenObject(value[i], `${newKey}[${i}]`, maxDepth, currentDepth + 1)
            );
          }
        } else {
          result[newKey] = JSON.stringify(value);
        }
      }
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

export function detectValueType(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value instanceof Date) {
    return 'date';
  }
  if (typeof value === 'object') {
    return 'object';
  }
  return typeof value;
}

export function inferColumnType(values: any[]): string {
  const nonNullValues = values.filter(v => v !== null && v !== undefined);

  if (nonNullValues.length === 0) {
    return 'unknown';
  }

  const types = new Set(nonNullValues.map(detectValueType));

  if (types.size === 1) {
    const type = nonNullValues[0];
    if (typeof type === 'number') {
      return Number.isInteger(type) ? 'integer' : 'float';
    }
    return Array.from(types)[0];
  }

  if (types.has('number') && (types.has('string') || types.has('null'))) {
    return 'string';
  }

  if (types.has('object') || types.has('array')) {
    return 'string';
  }

  return 'string';
}
