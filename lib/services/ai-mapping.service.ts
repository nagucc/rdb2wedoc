import { getAIConfig, getConfig } from '@/lib/config';
import { DatabaseField, DocumentField, FieldMappingUI } from '@/types';
import { Logger } from '@/lib/utils/helpers';

interface AIMappingResponse {
  mappings: Array<{
    databaseColumn: string;
    documentField: string;
    documentFieldId: string;
    dataType: string;
    description?: string;
  }>;
}



export class AIMappingService {
  private static instance: AIMappingService;

  private constructor() {}

  static getInstance(): AIMappingService {
    if (!AIMappingService.instance) {
      AIMappingService.instance = new AIMappingService();
    }
    return AIMappingService.instance;
  }

  private buildPrompt(databaseFields: DatabaseField[], documentFields: DocumentField[]): string {
    const dbFieldsInfo = databaseFields.map(f => 
      `- 名称: ${f.name}, 类型: ${f.type}, 注释: ${f.comment || '无'}, 可空: ${f.nullable}, 主键: ${f.primaryKey}`
    ).join('\n');

    const docFieldsInfo = documentFields.map(f => 
      `- ID: ${f.id}, 名称: ${f.name}, 类型: ${f.type}, 描述: ${f.description || '无'}`
    ).join('\n');

    const config = getConfig();
    
    return config.templates.fieldMapping
      .replace('{{dbFieldsInfo}}', dbFieldsInfo)
      .replace('{{docFieldsInfo}}', docFieldsInfo);
  }

  private async callOpenAI(prompt: string): Promise<AIMappingResponse> {
    const config = getAIConfig();

    if (!config.apiKey) {
      throw new Error('AI API Key未配置，请在config/config.json中设置ai.apiKey');
    }

    const requestBody = {
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('AI API返回空响应');
      }

      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('AI返回的内容中未找到有效的JSON');
      }

      return JSON.parse(jsonMatch[0]) as AIMappingResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`AI API请求超时（${config.timeout}ms）`);
      }
      
      throw error;
    }
  }

  async suggestFieldMappings(
    databaseFields: DatabaseField[],
    documentFields: DocumentField[]
  ): Promise<FieldMappingUI[]> {
    try {
      if (!databaseFields.length) {
        throw new Error('源数据库字段不能为空');
      }

      if (!documentFields.length) {
        throw new Error('目标文档字段不能为空');
      }

      const prompt = this.buildPrompt(databaseFields, documentFields);
      const config = getAIConfig();

      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
        try {
          Logger.info(`AI字段映射请求 - 尝试 ${attempt}/${config.maxRetries}`, {
            dbFieldCount: databaseFields.length,
            docFieldCount: documentFields.length
          });

          const response = await this.callOpenAI(prompt);
          
          const mappings: FieldMappingUI[] = response.mappings.map((m, index) => ({
            id: `ai_mapping_${Date.now()}_${index}`,
            databaseColumn: m.databaseColumn,
            documentField: m.documentField,
            documentFieldId: m.documentFieldId,
            dataType: m.dataType as 'string' | 'number' | 'date' | 'boolean' | 'json',
            description: m.description
          }));

          Logger.info('AI字段映射成功', {
            mappingCount: mappings.length,
            attempt
          });

          return mappings;
        } catch (error) {
          lastError = error as Error;
          Logger.error(`AI字段映射请求失败 - 尝试 ${attempt}/${config.maxRetries}`, {
            error: (error as Error).message
          });

          if (attempt < config.maxRetries) {
            const delay = attempt * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError || new Error('AI字段映射请求失败');
    } catch (error) {
      Logger.error('AI字段映射服务错误', {
        error: (error as Error).message,
        dbFieldCount: databaseFields.length,
        docFieldCount: documentFields.length
      });
      throw error;
    }
  }

  private fallbackSuggestion(
    databaseFields: DatabaseField[],
    documentFields: DocumentField[]
  ): FieldMappingUI[] {
    const mappings: FieldMappingUI[] = [];
    const usedDocFieldIds = new Set<string>();

    for (const dbField of databaseFields) {
      let bestMatch: DocumentField | null = null;
      let bestScore = 0;

      for (const docField of documentFields) {
        if (usedDocFieldIds.has(docField.id)) {
          continue;
        }

        const score = this.calculateMatchScore(dbField, docField);
        if (score > bestScore && score > 0.6) {
          bestScore = score;
          bestMatch = docField;
        }
      }

      if (bestMatch) {
        usedDocFieldIds.add(bestMatch.id);
        mappings.push({
          id: `fallback_mapping_${Date.now()}_${mappings.length}`,
          databaseColumn: dbField.name,
          documentField: bestMatch.name,
          documentFieldId: bestMatch.id,
          dataType: this.inferDataType(dbField.type),
          description: '本地算法推荐'
        });
      }
    }

    return mappings;
  }

  private calculateMatchScore(dbField: DatabaseField, docField: DocumentField): number {
    let score = 0;
    const dbName = dbField.name.toLowerCase();
    const docName = docField.name.toLowerCase();

    if (dbName === docName) {
      score += 1.0;
    } else if (dbName.includes(docName) || docName.includes(dbName)) {
      score += 0.7;
    } else {
      const dbCamel = dbName.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const docCamel = docName.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (dbCamel === docCamel) {
        score += 0.8;
      }
    }

    if (this.isTypeCompatible(dbField.type, docField.type)) {
      score += 0.2;
    }

    return score;
  }

  private isTypeCompatible(dbType: string, docType: string): boolean {
    const dbTypeLower = dbType.toLowerCase();
    const docTypeLower = docType.toLowerCase();

    if (dbTypeLower.includes('int') || dbTypeLower.includes('decimal') || dbTypeLower.includes('number')) {
      return docTypeLower.includes('number');
    }

    if (dbTypeLower.includes('char') || dbTypeLower.includes('text') || dbTypeLower.includes('varchar')) {
      return docTypeLower.includes('string') || docTypeLower.includes('text');
    }

    if (dbTypeLower.includes('date') || dbTypeLower.includes('time')) {
      return docTypeLower.includes('date') || docTypeLower.includes('time');
    }

    if (dbTypeLower.includes('bool')) {
      return docTypeLower.includes('bool');
    }

    return false;
  }

  private inferDataType(dbType: string): 'string' | 'number' | 'date' | 'boolean' | 'json' {
    const typeLower = dbType.toLowerCase();

    if (typeLower.includes('int') || typeLower.includes('decimal') || typeLower.includes('float') || typeLower.includes('double')) {
      return 'number';
    }

    if (typeLower.includes('date') || typeLower.includes('time') || typeLower.includes('timestamp')) {
      return 'date';
    }

    if (typeLower.includes('bool')) {
      return 'boolean';
    }

    if (typeLower.includes('json')) {
      return 'json';
    }

    return 'string';
  }
}

export const aiMappingService = AIMappingService.getInstance();
