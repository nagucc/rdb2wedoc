import axios, { AxiosInstance } from 'axios';
import { WeComDocument, DocumentSheet, DocumentField } from '@/types';
import { Logger } from '../utils/helpers';

export class WeComDocumentService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://qyapi.weixin.qq.com',
      timeout: 30000,
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

  

  async getSheetFields(accessToken: string, documentId: string, sheetId: string): Promise<DocumentField[]> {
    try {
      console.log(`[WeComService] 调用Sheet字段API`, {
        endpoint: '/cgi-bin/wedoc/smartsheet/get_fields',
        documentId,
        sheetId,
        timestamp: new Date().toISOString()
      });

      const response = await this.client.post('/cgi-bin/wedoc/smartsheet/get_fields', {
        docid: documentId,
        sheet_id: sheetId,
        offset: 0,
        limit: 1000
      }, {
        params: {
          access_token: accessToken
        }
      });

      console.log(`[WeComService] Sheet字段API响应`, {
        status: response.status,
        errcode: response.data.errcode,
        errmsg: response.data.errmsg,
        fieldCount: response.data.fields?.length || 0,
        timestamp: new Date().toISOString()
      });

      if (response.data.errcode !== 0) {
        throw new Error(`获取Sheet字段失败: ${response.data.errmsg}`);
      }

      let fields: DocumentField[] = [];
      
      if (response.data.fields && response.data.fields.length > 0) {
        fields = response.data.fields.map((field: any) => ({
          id: field.field_id,
          name: field.field_title,
          type: this.mapFieldType(field.field_type)
        }));
      }

      return fields;
    } catch (error) {
      Logger.error('获取Sheet字段失败', { error: (error as Error).message });
      throw error;
    }
  }

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

  async readSheetData(accessToken: string, documentId: string, sheetId: string): Promise<any[]> {
    try {
      const response = await this.client.post('/cgi-bin/wedoc/smartsheet/get_sheet_rows', {
        access_token: accessToken,
        docid: documentId,
        sheet_id: sheetId,
        offset: 0,
        limit: 1000
      });

      if (response.data.errcode !== 0) {
        throw new Error(`读取Sheet数据失败: ${response.data.errmsg}`);
      }

      return response.data.rows || [];
    } catch (error) {
      Logger.error('读取Sheet数据失败', { error: (error as Error).message });
      throw error;
    }
  }

  async writeSheetData(
    accessToken: string,
    documentId: string,
    sheetId: string,
    data: any[]
  ): Promise<boolean> {
    try {
      const response = await this.client.post('/cgi-bin/wedoc/smartsheet/batch_update_rows', {
        access_token: accessToken,
        docid: documentId,
        sheet_id: sheetId,
        rows: data
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
    data: any[]
  ): Promise<boolean> {
    try {
      const response = await this.client.post('/cgi-bin/wedoc/smartsheet/append_rows', {
        access_token: accessToken,
        docid: documentId,
        sheet_id: sheetId,
        rows: data
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

  /**
   * 清空企业微信文档中指定 Sheet 的所有数据
   *
   * @param accessToken - 企业微信访问令牌
   * @param documentId - 文档ID
   * @param sheetId - Sheet ID
   * @returns Promise<boolean> - 清空成功返回 true，失败抛出异常
   * @throws Error - 当清空操作失败时抛出错误
   */
  async clearSheetData(accessToken: string, documentId: string, sheetId: string): Promise<boolean> {
    try {
      Logger.info('开始清空Sheet数据', { documentId, sheetId });

      const allRecordIds: string[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        Logger.info('获取Sheet记录', { documentId, sheetId, offset, limit });

        const recordsResponse = await this.client.post('/cgi-bin/wedoc/smartsheet/get_records', null, {
          params: {
            access_token: accessToken
          },
          data: {
            docid: documentId,
            sheet_id: sheetId,
            offset: offset,
            limit: limit,
          }
        });

        if (recordsResponse.data.errcode !== 0) {
          throw new Error(`获取Sheet记录失败: ${recordsResponse.data.errmsg}`);
        }

        const records = recordsResponse.data.records || [];
        records.forEach((record: any) => {
          if (record.record_id) {
            allRecordIds.push(record.record_id);
          }
        });

        hasMore = recordsResponse.data.has_more || false;
        offset = recordsResponse.data.next || offset + limit;

        Logger.info('已获取记录', { 
          documentId, 
          sheetId, 
          currentBatch: records.length, 
          total: allRecordIds.length,
          hasMore 
        });
      }

      Logger.info('获取记录完成', { documentId, sheetId, totalRecords: allRecordIds.length });

      if (allRecordIds.length === 0) {
        Logger.info('Sheet中没有记录，无需删除', { documentId, sheetId });
        return true;
      }

      const batchSize = 500;
      for (let i = 0; i < allRecordIds.length; i += batchSize) {
        const batch = allRecordIds.slice(i, i + batchSize);
        
        Logger.info('批量删除记录', { 
          documentId, 
          sheetId, 
          batchIndex: Math.floor(i / batchSize) + 1, 
          batchSize: batch.length,
          totalBatches: Math.ceil(allRecordIds.length / batchSize) 
        });

        const deleteResponse = await this.client.post('/cgi-bin/wedoc/smartsheet/delete_records', null, {
          params: {
            access_token: accessToken
          },
          data: {
            docid: documentId,
            sheet_id: sheetId,
            record_ids: batch
          }
        });

        if (deleteResponse.data.errcode !== 0) {
          throw new Error(`删除Sheet记录失败: ${deleteResponse.data.errmsg}`);
        }

        Logger.info('批量删除记录成功', { 
          documentId, 
          sheetId, 
          batchIndex: Math.floor(i / batchSize) + 1,
          deletedCount: batch.length 
        });
      }

      Logger.info('清空Sheet数据成功', { documentId, sheetId, totalDeleted: allRecordIds.length });
      return true;
    } catch (error) {
      Logger.error('清空Sheet数据失败', { 
        error: (error as Error).message,
        documentId,
        sheetId 
      });
      throw error;
    }
  }

  async testConnection(document: WeComDocument): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken(document.id, document.accessToken);
      const sheets = await this.getDocumentSheets(accessToken, document.documentId);
      return sheets.length > 0;
    } catch (error) {
      Logger.error('测试企业微信文档连接失败', { error: (error as Error).message });
      return false;
    }
  }

  async getDocumentInfo(accessToken: string, documentId: string): Promise<any> {
    try {
      console.log(`[WeComService] 调用文档信息API`, {
        endpoint: '/cgi-bin/wedoc/get_doc_base_info',
        documentId,
        timestamp: new Date().toISOString()
      });

      const response = await this.client.post('/cgi-bin/wedoc/get_doc_base_info', {
        docid: documentId
      }, {
        params: {
          access_token: accessToken
        }
      });

      console.log(`[WeComService] 文档信息API响应`, {
        status: response.status,
        errcode: response.data.errcode,
        errmsg: response.data.errmsg,
        hasDocBaseInfo: !!response.data.doc_base_info,
        timestamp: new Date().toISOString()
      });

      if (response.data.errcode !== 0) {
        throw new Error(`获取文档信息失败 (errcode: ${response.data.errcode}): ${response.data.errmsg}`);
      }

      return response.data;
    } catch (error) {
      if ((error as any).response) {
        console.error(`[WeComService] 文档信息API请求失败`, {
          status: (error as any).response.status,
          statusText: (error as any).response.statusText,
          data: (error as any).response.data,
          timestamp: new Date().toISOString()
        });
      }
      Logger.error('获取文档信息失败', { error: (error as Error).message });
      throw error;
    }
  }

  async getDocumentSheets(accessToken: string, documentId: string): Promise<DocumentSheet[]> {
    try {
      console.log(`[WeComService] 调用Sheet列表API`, {
        endpoint: '/cgi-bin/wedoc/smartsheet/get_sheet',
        documentId,
        timestamp: new Date().toISOString()
      });

      const response = await this.client.post('/cgi-bin/wedoc/smartsheet/get_sheet', {
        docid: documentId,
        need_all_type_sheet: true
      }, {
        params: {
          access_token: accessToken
        }
      });

      console.log(`[WeComService] Sheet列表API响应`, {
        status: response.status,
        errcode: response.data.errcode,
        errmsg: response.data.errmsg,
        sheetCount: response.data.sheet_list?.length || 0,
        timestamp: new Date().toISOString()
      });

      if (response.data.errcode !== 0) {
        throw new Error(`获取Sheet列表失败 (errcode: ${response.data.errcode}): ${response.data.errmsg}`);
      }

      const sheets: DocumentSheet[] = [];
      
      if (response.data.sheet_list && response.data.sheet_list.length > 0) {
        for (const sheet of response.data.sheet_list) {
          if (sheet.is_visible === true && sheet.type === 'smartsheet') {
            sheets.push({
              id: sheet.sheet_id,
              name: sheet.title,
              fields: []
            });
          }
        }
      }

      console.log(`[WeComService] 筛选后的Sheet列表`, {
        totalSheets: response.data.sheet_list?.length || 0,
        filteredSheets: sheets.length,
        timestamp: new Date().toISOString()
      });

      return sheets;
    } catch (error) {
      if ((error as any).response) {
        console.error(`[WeComService] Sheet列表API请求失败`, {
          status: (error as any).response.status,
          statusText: (error as any).response.statusText,
          data: (error as any).response.data,
          timestamp: new Date().toISOString()
        });
      }
      Logger.error('获取文档Sheet列表失败', { error: (error as Error).message });
      throw error;
    }
  }
}

// 单例模式
export const weComDocumentService = new WeComDocumentService();
