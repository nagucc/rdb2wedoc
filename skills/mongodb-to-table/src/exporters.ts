/**
 * MongoDB to 2D Table Mapping Skill - Exporters
 * 
 * Provides export functionality for table data in various formats.
 */

import { TableData, ExportOptions } from './types';
import { ExportError, ConfigurationError } from './errors';

export interface Exporter {
  export(data: TableData): string;
  exportToFile(data: TableData, filePath: string): void;
}

abstract class BaseExporter implements Exporter {
  protected options: ExportOptions;

  constructor(options: ExportOptions) {
    this.options = options;
  }

  abstract export(data: TableData): string;

  exportToFile(data: TableData, filePath: string): void {
    const content = this.export(data);
    const fs = require('fs');
    const encoding = this.options.encoding || 'utf-8';
    fs.writeFileSync(filePath, content, encoding);
  }

  protected formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (value instanceof Date) {
      const format = this.options.dateFormat || 'ISO';
      return this.formatDate(value, format);
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  protected formatDate(date: Date, format: string): string {
    switch (format) {
      case 'ISO':
        return date.toISOString();
      case 'date':
        return date.toISOString().split('T')[0];
      case 'datetime':
        return date.toISOString().slice(0, 19).replace('T', ' ');
      case 'unix':
        return String(Math.floor(date.getTime() / 1000));
      default:
        return date.toISOString();
    }
  }
}

export class CSVExporter extends BaseExporter {
  private separator: string;
  private quoteCharacter: string;

  constructor(options: ExportOptions) {
    super(options);
    this.separator = options.format === 'csv' ? ',' : '\t';
    this.quoteCharacter = '"';
  }

  export(data: TableData): string {
    if (data.rows.length === 0) {
      return '';
    }

    const lines: string[] = [];

    if (this.options.headers !== false) {
      const headers = data.columns.map(col => col.name);
      lines.push(this.formatRow(headers));
    }

    for (const row of data.rows) {
      const values = data.columns.map(col => {
        const value = row[col.name];
        return this.formatCSVValue(value);
      });
      lines.push(this.formatRow(values));
    }

    return lines.join('\n');
  }

  private formatRow(values: string[]): string {
    return values.map(v => `${this.quoteCharacter}${v}${this.quoteCharacter}`).join(this.separator);
  }

  private formatCSVValue(value: any): string {
    const formatted = this.formatValue(value);
    const needsQuoting =
      formatted.includes(this.separator) ||
      formatted.includes(this.quoteCharacter) ||
      formatted.includes('\n') ||
      formatted.includes('\r');

    if (needsQuoting) {
      const escaped = formatted.replace(new RegExp(this.quoteCharacter, 'g'), `${this.quoteCharacter}${this.quoteCharacter}`);
      return escaped;
    }

    return formatted;
  }
}

export class JSONExporter extends BaseExporter {
  export(data: TableData): string {
    if (this.options.headers === false) {
      return JSON.stringify(data.rows, null, 2);
    }

    const output = {
      metadata: data.metadata,
      columns: data.columns,
      data: data.rows
    };

    return JSON.stringify(output, null, 2);
  }

  exportToFile(data: TableData, filePath: string): void {
    const content = this.export(data);
    const fs = require('fs');
    const encoding = this.options.encoding || 'utf-8';
    fs.writeFileSync(filePath, content, encoding);
  }
}

export class ArrayExporter extends BaseExporter {
  export(data: TableData): string {
    if (data.rows.length === 0) {
      return JSON.stringify([]);
    }

    if (this.options.headers === false) {
      return JSON.stringify(data.rows.map(row => Object.values(row)), null, 2);
    }

    const columnNames = data.columns.map(col => col.name);
    const rows = data.rows.map(row => Object.values(row));

    return JSON.stringify([columnNames, ...rows], null, 2);
  }
}

export class ExcelExporter extends BaseExporter {
  private sheetName: string;

  constructor(options: ExportOptions) {
    super(options);
    this.sheetName = options.filename || 'Sheet1';
  }

  export(data: TableData): string {
    throw new ExportError('Excel export requires xlsx library', 'excel');
  }

  exportToFile(data: TableData, filePath: string): void {
    try {
      const XLSX = require('xlsx');
      
      const worksheetData = [
        data.columns.map(col => col.name),
        ...data.rows.map(row => data.columns.map(col => row[col.name]))
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, this.sheetName);
      XLSX.writeFile(workbook, filePath);
    } catch (error) {
      throw new ExportError(
        `Excel library not available: ${(error as Error).message}`,
        'excel'
      );
    }
  }
}

export function createExporter(options: ExportOptions): Exporter {
  switch (options.format) {
    case 'csv':
      return new CSVExporter(options);
    case 'json':
      return new JSONExporter(options);
    case 'array':
      return new ArrayExporter(options);
    default:
      throw new ConfigurationError(`Unknown export format: ${options.format}`);
  }
}

export function exportToCSV(data: TableData, options?: Partial<ExportOptions>): string {
  const fullOptions: ExportOptions = {
    format: 'csv',
    headers: true,
    encoding: 'utf-8',
    ...options
  };
  const exporter = createExporter(fullOptions);
  return exporter.export(data);
}

export function exportToJSON(data: TableData, options?: Partial<ExportOptions>): string {
  const fullOptions: ExportOptions = {
    format: 'json',
    headers: true,
    encoding: 'utf-8',
    ...options
  };
  const exporter = createExporter(fullOptions);
  return exporter.export(data);
}

export function exportToArray(data: TableData, options?: Partial<ExportOptions>): string {
  const fullOptions: ExportOptions = {
    format: 'array',
    headers: true,
    encoding: 'utf-8',
    ...options
  };
  const exporter = createExporter(fullOptions);
  return exporter.export(data);
}
