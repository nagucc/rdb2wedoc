/**
 * MongoDB to 2D Table Mapping Skill - Error Handling
 * 
 * Provides comprehensive error handling and validation mechanisms
 * for the mapping process.
 */

export class MappingError extends Error {
  public readonly code: string;
  public readonly field?: string;
  public readonly documentId?: string;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    options?: {
      field?: string;
      documentId?: string;
      recoverable?: boolean;
    }
  ) {
    super(message);
    this.name = 'MappingError';
    this.code = code;
    this.field = options?.field;
    this.documentId = options?.documentId;
    this.recoverable = options?.recoverable ?? true;
  }
}

export class ValidationError extends MappingError {
  constructor(
    message: string,
    field?: string,
    value?: any
  ) {
    super(
      `Validation failed: ${message}`,
      'VALIDATION_ERROR',
      { field, recoverable: true }
    );
    this.name = 'ValidationError';
  }
}

export class TransformationError extends MappingError {
  constructor(
    message: string,
    field: string,
    value: any,
    documentId?: string
  ) {
    super(
      `Transformation failed for field "${field}": ${message}`,
      'TRANSFORMATION_ERROR',
      { field, documentId, recoverable: true }
    );
    this.name = 'TransformationError';
  }
}

export class ConfigurationError extends MappingError {
  constructor(message: string) {
    super(
      `Configuration error: ${message}`,
      'CONFIGURATION_ERROR',
      { recoverable: false }
    );
    this.name = 'ConfigurationError';
  }
}

export class ExportError extends MappingError {
  constructor(message: string, format: string) {
    super(
      `Export failed (${format}): ${message}`,
      'EXPORT_ERROR',
      { recoverable: true }
    );
    this.name = 'ExportError';
  }
}

export class ErrorCollector {
  private errors: MappingError[] = [];

  add(error: MappingError): void {
    this.errors.push(error);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): MappingError[] {
    return [...this.errors];
  }

  getRecoverableErrors(): MappingError[] {
    return this.errors.filter(e => e.recoverable);
  }

  getCriticalErrors(): MappingError[] {
    return this.errors.filter(e => !e.recoverable);
  }

  clear(): void {
    this.errors = [];
  }

  summary(): {
    total: number;
    recoverable: number;
    critical: number;
    byCode: Record<string, number>;
  } {
    const byCode: Record<string, number> = {};
    for (const error of this.errors) {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    }

    return {
      total: this.errors.length,
      recoverable: this.errors.filter(e => e.recoverable).length,
      critical: this.errors.filter(e => !e.recoverable).length,
      byCode
    };
  }
}

export function validateMappingConfig(config: any): void {
  if (!config) {
    throw new ConfigurationError('Mapping configuration is required');
  }

  if (!config.fieldMappings || !Array.isArray(config.fieldMappings)) {
    throw new ConfigurationError('fieldMappings must be an array');
  }

  if (config.mongoMappingType === 'array_expand' && !config.mongoArrayField) {
    throw new ConfigurationError(
      'mongoArrayField is required when using array_expand mapping type'
    );
  }

  if (config.mongoMappingType && !['flatten', 'array_expand'].includes(config.mongoMappingType)) {
    throw new ConfigurationError(
      `Invalid mongoMappingType: ${config.mongoMappingType}. Must be 'flatten' or 'array_expand'`
    );
  }

  for (const mapping of config.fieldMappings) {
    if (!mapping.databaseField || typeof mapping.databaseField !== 'string') {
      throw new ValidationError(
        'databaseField must be a non-empty string',
        'databaseField'
      );
    }

    if (!mapping.documentField || typeof mapping.documentField !== 'string') {
      throw new ValidationError(
        'documentField must be a non-empty string',
        'documentField'
      );
    }
  }
}

export function validateInputData(data: any[]): void {
  if (!Array.isArray(data)) {
    throw new ValidationError('Input data must be an array');
  }

  if (data.length === 0) {
    throw new ValidationError('Input data array cannot be empty');
  }

  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const doc = data[i];
    if (!doc || typeof doc !== 'object') {
      throw new ValidationError(
        `Document at index ${i} must be an object`,
        undefined,
        doc
      );
    }
  }
}
