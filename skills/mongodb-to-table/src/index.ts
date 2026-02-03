/**
 * MongoDB to 2D Table Mapping Skill
 * 
 * A general-purpose, reusable module for converting MongoDB documents
 * to 2D table format with support for both flatten and array_expand mapping modes.
 * 
 * @version 1.1.0
 * @license MIT
 * @author MongoDB to Table Mapping Skill
 * 
 * Features:
 * - Support for flatten mapping (nested objects to flat columns, arrays to JSON strings)
 * - Support for array_expand mapping (array elements expand to separate rows)
 * - Compatible with MongoDB $unwind aggregation (uses dot notation for nested fields)
 * - Custom field mappings with transformation rules
 * - Multiple export formats (CSV, JSON, Array)
 * - Comprehensive error handling and validation
 * - Type-safe implementation with TypeScript
 * 
 * Usage:
 * ```typescript
 * import { createMapper, mapMongoDBToTable, exportToCSV } from 'mongodb-to-table';
 * 
 * const mapper = createMapper({
 *   mongoMappingType: 'flatten',
 *   fieldMappings: [
 *     { databaseField: '_id', documentField: 'id' },
 *     { databaseField: 'name', documentField: 'name' }
 *   ]
 * });
 * 
 * const tableData = mapper.map(documents);
 * const csv = mapper.export(tableData, { format: 'csv' });
 * ```
 * 
 * Array Expand Mode (with $unwind compatibility):
 * ```typescript
 * const mapper = createMapper({
 *   mongoMappingType: 'array_expand',
 *   mongoArrayField: 'comments',
 *   fieldMappings: [
 *     { databaseField: '_id', documentField: 'post_id' },
 *     { databaseField: 'comments.user', documentField: 'comment_user' },
 *     { databaseField: 'comments.text', documentField: 'comment_text' }
 *   ]
 * });
 * ```
 */

export * from './types';
export * from './errors';
export * from './transformers';
export * from './mapper';
export * from './exporters';

import { MongoDBToTableMapper, createMapper, mapMongoDBToTable } from './mapper';
import { TableData, MappingConfig, MongoDBDocument, ExportOptions } from './types';
import { exportToCSV, exportToJSON, exportToArray } from './exporters';

const defaultMapper = createMapper({
  mongoMappingType: 'flatten',
  fieldMappings: []
});

export interface QuickMappingOptions {
  mongoMappingType?: 'flatten' | 'array_expand';
  mongoArrayField?: string;
  fieldMappings?: Array<{
    databaseField: string;
    documentField: string;
    transform?: {
      type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'custom';
      format?: string;
    };
  }>;
  includeAllFields?: boolean;
  excludeFields?: string[];
  nullValue?: string;
  skipInvalidRows?: boolean;
}

export function quickMap(
  documents: MongoDBDocument[],
  options?: QuickMappingOptions
): TableData {
  const config: MappingConfig = {
    mongoMappingType: options?.mongoMappingType || 'flatten',
    mongoArrayField: options?.mongoArrayField,
    fieldMappings: options?.fieldMappings || [],
    options: {
      includeAllFields: options?.includeAllFields,
      excludeFields: options?.excludeFields,
      nullValue: options?.nullValue,
      skipInvalidRows: options?.skipInvalidRows
    }
  };

  return mapMongoDBToTable(documents, config);
}

export function quickExport(
  data: TableData,
  format: 'csv' | 'json' | 'array',
  options?: Partial<ExportOptions>
): string {
  const fullOptions: ExportOptions = {
    format,
    headers: true,
    encoding: 'utf-8',
    ...options
  };

  switch (format) {
    case 'csv':
      return exportToCSV(data, fullOptions);
    case 'json':
      return exportToJSON(data, fullOptions);
    case 'array':
      return exportToArray(data, fullOptions);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

export {
  MongoDBToTableMapper,
  createMapper,
  mapMongoDBToTable
};

export type {
  TableData,
  MappingConfig,
  MongoDBDocument,
  ExportOptions
};
