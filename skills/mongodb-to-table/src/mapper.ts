/**
 * MongoDB to 2D Table Mapping Skill - Core Mapper
 * 
 * Implements the main mapping logic for MongoDB to 2D table transformation,
 * supporting both flatten and array_expand mapping modes.
 */

import {
  MongoDBDocument,
  MappingConfig,
  TableData,
  TableColumn,
  FieldMapping,
  MongoDBMappingType,
  ProcessingStats,
  ArrayFieldInfo,
  MappingOptions,
  ExportOptions
} from './types';
import {
  MappingError,
  ValidationError,
  ConfigurationError,
  ErrorCollector,
  validateMappingConfig,
  validateInputData
} from './errors';
import {
  transformObject,
  flattenObject,
  getNestedValue,
  inferColumnType
} from './transformers';
import { Exporter, CSVExporter, JSONExporter, ArrayExporter } from './exporters';

export class MongoDBToTableMapper {
  private config: MappingConfig;
  private errorCollector: ErrorCollector;
  private arrayFieldCache: Map<string, ArrayFieldInfo>;

  constructor(config: MappingConfig) {
    validateMappingConfig(config);
    this.config = config;
    this.errorCollector = new ErrorCollector();
    this.arrayFieldCache = new Map();
  }

  public map(documents: MongoDBDocument[]): TableData {
    validateInputData(documents);

    this.errorCollector.clear();

    let result: TableData;

    switch (this.config.mongoMappingType) {
      case 'array_expand':
        result = this.mapWithArrayExpand(documents);
        break;
      case 'flatten':
      default:
        result = this.mapWithFlatten(documents);
        break;
    }

    return result;
  }

  private mapWithFlatten(documents: MongoDBDocument[]): TableData {
    const rows: Record<string, any>[] = [];
    const options = this.config.options || {};

    for (const doc of documents) {
      try {
        const flattened = this.flattenDocument(doc, options);
        const mappedRow = this.applyFieldMappings(flattened, doc);
        rows.push(mappedRow);
      } catch (error) {
        this.handleMappingError(error, doc._id);
        if (!options.skipInvalidRows) {
          throw error;
        }
      }
    }

    return this.createTableData(rows, 'flatten', documents.length);
  }

  private mapWithArrayExpand(documents: MongoDBDocument[]): TableData {
    const rows: Record<string, any>[] = [];
    const options = this.config.options || {};
    const arrayField = this.config.mongoArrayField!;
    const normalizedArrayField = arrayField.endsWith('[]')
      ? arrayField.slice(0, -2)
      : arrayField;

    for (const doc of documents) {
      try {
        const arrayValue = getNestedValue(doc, normalizedArrayField);
        
        if (!arrayValue || !Array.isArray(arrayValue)) {
          if (options.skipInvalidRows) {
            continue;
          }
          throw new ValidationError(
            `Document does not contain array field: ${arrayField}`,
            arrayField,
            doc
          );
        }

        for (const arrayElement of arrayValue) {
          const expandedDoc = this.createExpandedDocument(
            doc,
            normalizedArrayField,
            arrayElement,
            options
          );
          const flattened = this.flattenDocument(expandedDoc, options);
          const mappedRow = this.applyFieldMappings(flattened, doc);
          rows.push(mappedRow);
        }
      } catch (error) {
        this.handleMappingError(error, doc._id);
        if (!options.skipInvalidRows) {
          throw error;
        }
      }
    }

    return this.createTableData(rows, 'array_expand', documents.length);
  }

  private flattenDocument(
    doc: MongoDBDocument,
    options: MappingOptions
  ): Record<string, any> {
    const maxDepth = options.maxDepth || 10;
    const flattened = flattenObject(doc, '', maxDepth);

    const excludeFields = options.excludeFields || [];
    const preserveBuffer = options.preserveBufferFields ?? false;

    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(flattened)) {
      if (excludeFields.includes(key)) {
        continue;
      }

      if (!preserveBuffer) {
        if (key.endsWith('.buffer') || /\.buffer\.\d+$/.test(key)) {
          continue;
        }
      }

      result[key] = value;
    }

    return result;
  }

  private createExpandedDocument(
    originalDoc: MongoDBDocument,
    arrayField: string,
    arrayElement: any,
    options: MappingOptions
  ): Record<string, any> {
    const expanded: Record<string, any> = {};

    for (const [key, value] of Object.entries(originalDoc)) {
      if (key === arrayField) {
        if (typeof arrayElement === 'object' && arrayElement !== null) {
          for (const [nestedKey, nestedValue] of Object.entries(arrayElement)) {
            expanded[`${arrayField}.${nestedKey}`] = nestedValue;
          }
        } else {
          expanded[arrayField] = arrayElement;
        }
      } else if (key === '_id') {
        expanded[key] = value;
      } else {
        expanded[key] = value;
      }
    }

    return expanded;
  }

  private applyFieldMappings(
    flattenedDoc: Record<string, any>,
    originalDoc: MongoDBDocument
  ): Record<string, any> {
    if (this.config.options?.includeAllFields) {
      return flattenedDoc;
    }

    return transformObject(
      flattenedDoc,
      this.config.fieldMappings,
      {
        nullValue: this.config.options?.nullValue,
        dateFormat: this.config.options?.dateFormat
      }
    );
  }

  private createTableData(
    rows: Record<string, any>[],
    mappingType: MongoDBMappingType,
    sourceDocumentCount: number
  ): TableData {
    if (rows.length === 0) {
      return {
        columns: [],
        rows: [],
        metadata: {
          totalRows: 0,
          totalColumns: 0,
          mappingType,
          sourceCollection: '',
          generatedAt: new Date().toISOString()
        }
      };
    }

    const columns: TableColumn[] = this.inferColumns(rows);

    return {
      columns,
      rows,
      metadata: {
        totalRows: rows.length,
        totalColumns: columns.length,
        mappingType,
        sourceCollection: this.config.sourceTableName || 'unknown',
        generatedAt: new Date().toISOString()
      }
    };
  }

  private inferColumns(rows: Record<string, any>[]): TableColumn[] {
    const columnNames = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        columnNames.add(key);
      }
    }

    const columns: TableColumn[] = [];

    for (const name of columnNames) {
      const values = rows.map(row => row[name]);
      const type = inferColumnType(values);
      const required = values.every(v => v !== null && v !== undefined);

      columns.push({
        name,
        type,
        required
      });
    }

    return columns.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  private handleMappingError(error: unknown, documentId?: any): void {
    if (error instanceof MappingError) {
      this.errorCollector.add(error);
    } else {
      this.errorCollector.add(
        new MappingError(
          (error as Error).message,
          'UNKNOWN_ERROR',
          { documentId: String(documentId) }
        )
      );
    }
  }

  public getStats(): ProcessingStats {
    return {
      totalDocuments: 0,
      processedRows: this.config.options?.includeAllFields ? 0 : 0,
      skippedRows: this.errorCollector.getErrors().length,
      errorCount: this.errorCollector.getErrors().length,
      errors: this.errorCollector.getErrors().map(e => ({
        documentId: e.documentId || 'unknown',
        field: e.field,
        message: e.message,
        timestamp: new Date()
      }))
    };
  }

  public hasErrors(): boolean {
    return this.errorCollector.hasErrors();
  }

  public getErrors(): MappingError[] {
    return this.errorCollector.getErrors();
  }

  public export(data: TableData, options: ExportOptions): string {
    let exporter: Exporter;

    switch (options.format) {
      case 'csv':
        exporter = new CSVExporter(options);
        break;
      case 'json':
        exporter = new JSONExporter(options);
        break;
      case 'array':
        exporter = new ArrayExporter(options);
        break;
      default:
        throw new ConfigurationError(`Unknown export format: ${options.format}`);
    }

    return exporter.export(data);
  }

  public static analyzeArrayField(
    documents: MongoDBDocument[],
    fieldName: string
  ): ArrayFieldInfo | null {
    const normalizedField = fieldName.endsWith('[]')
      ? fieldName.slice(0, -2)
      : fieldName;

    const nestedFields = new Set<string>();
    let hasObjectElements = false;
    let elementCount = 0;

    for (const doc of documents) {
      const arrayValue = getNestedValue(doc, normalizedField);
      if (Array.isArray(arrayValue)) {
        elementCount += arrayValue.length;
        for (const element of arrayValue) {
          if (typeof element === 'object' && element !== null) {
            hasObjectElements = true;
            for (const key of Object.keys(element)) {
              nestedFields.add(`${fieldName}[].${key}`);
            }
          }
        }
      }
    }

    if (elementCount === 0) {
      return null;
    }

    return {
      fieldName,
      elementType: hasObjectElements ? 'object' : 'primitive',
      nestedFields: hasObjectElements ? Array.from(nestedFields) : undefined
    };
  }
}

export function createMapper(config: MappingConfig): MongoDBToTableMapper {
  return new MongoDBToTableMapper(config);
}

export function mapMongoDBToTable(
  documents: MongoDBDocument[],
  config: MappingConfig
): TableData {
  const mapper = createMapper(config);
  return mapper.map(documents);
}
