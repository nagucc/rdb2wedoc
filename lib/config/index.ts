import fs from 'fs';
import path from 'path';

export interface AIConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  timeout: number;
  maxRetries: number;
}

export interface TemplatesConfig {
  fieldMapping: string;
}

export interface DatabaseConfig {
  connectionTimeout: number;
  queryTimeout: number;
  maxConnections: number;
}

export interface WeComConfig {
  apiTimeout: number;
  maxRetries: number;
  cacheTTL: number;
}

export interface SyncConfig {
  defaultPageSize: number;
  maxRecordsPerSync: number;
  syncTimeout: number;
}

export interface AppConfig {
  templates: TemplatesConfig;
  ai: AIConfig;
  database: DatabaseConfig;
  wecom: WeComConfig;
  sync: SyncConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  templates: {
    fieldMapping: '你是一个数据映射专家。请根据源数据库表字段和目标智能表格字段，智能推荐字段映射关系。\n\n源数据库表字段：\n{{dbFieldsInfo}}\n\n目标智能表格字段：\n{{docFieldsInfo}}\n\n请分析字段名称、注释/描述等信息，为每个源字段找到最匹配的目标字段。\n\n重要规则：\n1. 每个目标字段只能映射一个源字段，不能多个源字段映射到同一个目标字段\n2. 优先匹配名称相似的字段（考虑大小写、下划线、驼峰命名等差异）\n3. 对于主键字段，优先映射到唯一标识字段\n4. 如果没有合适的匹配，可以跳过该字段\n\n请返回JSON格式的映射结果，格式如下：\n{\n  "mappings": [\n    {\n      "databaseColumn": "源字段名称",\n      "documentField": "目标字段名称",\n      "documentFieldId": "目标字段ID",\n      "dataType": "数据类型(string|number|date|boolean|json)",\n      "description": "映射说明（可选）"\n    }\n  ]\n}\n\n只返回JSON，不要包含其他文字说明。'
  },
  ai: {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    timeout: 30000,
    maxRetries: 3
  },
  database: {
    connectionTimeout: 30000,
    queryTimeout: 60000,
    maxConnections: 10
  },
  wecom: {
    apiTimeout: 30000,
    maxRetries: 3,
    cacheTTL: 3600000
  },
  sync: {
    defaultPageSize: 100,
    maxRecordsPerSync: 10000,
    syncTimeout: 300000
  }
};

let configCache: AppConfig | null = null;

function loadConfigFile(): AppConfig {
  try {
    const configPath = path.join(process.cwd(), 'config', 'config.json');
    
    if (!fs.existsSync(configPath)) {
      console.warn('Config file not found, using default config');
      return DEFAULT_CONFIG;
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent) as Partial<AppConfig>;

    return {
      templates: { ...DEFAULT_CONFIG.templates, ...config.templates },
      ai: { ...DEFAULT_CONFIG.ai, ...config.ai },
      database: { ...DEFAULT_CONFIG.database, ...config.database },
      wecom: { ...DEFAULT_CONFIG.wecom, ...config.wecom },
      sync: { ...DEFAULT_CONFIG.sync, ...config.sync }
    };
  } catch (error) {
    console.error('Failed to load config file, using default config:', error);
    return DEFAULT_CONFIG;
  }
}

export function getConfig(): AppConfig {
  if (!configCache) {
    configCache = loadConfigFile();
  }
  return configCache;
}

export function getAIConfig(): AIConfig {
  return getConfig().ai;
}

export function getDatabaseConfig(): DatabaseConfig {
  return getConfig().database;
}

export function getWeComConfig(): WeComConfig {
  return getConfig().wecom;
}

export function getSyncConfig(): SyncConfig {
  return getConfig().sync;
}

export function reloadConfig(): void {
  configCache = null;
}

export function validateConfig(): { valid: boolean; errors: string[] } {
  const config = getConfig();
  const errors: string[] = [];

  if (!config.ai.apiUrl) {
    errors.push('AI API URL is required');
  }

  if (!config.ai.apiKey) {
    errors.push('AI API Key is required');
  }

  if (!config.ai.model) {
    errors.push('AI Model is required');
  }

  if (config.ai.timeout <= 0) {
    errors.push('AI timeout must be positive');
  }

  if (config.ai.maxRetries < 0) {
    errors.push('AI maxRetries must be non-negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
