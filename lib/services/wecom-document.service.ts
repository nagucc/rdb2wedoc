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

  async getDocumentSheets(accessToken: string, documentId: string): Promise<DocumentSheet[]> {
    try {
      // 企业微信智能文档API - 获取文档的所有Sheet
      const response = await this.client.get('/cgi-bin/wedoc/smartsheet/get_sheet_list', {
        params: {
          access_token: accessToken,
          docid: documentId
        }
      });

      if (response.data.errcode !== 0) {
        throw new Error(`获取Sheet列表失败: ${response.data.errmsg}`);
      }

      const sheets: DocumentSheet[] = [];
      
      if (response.data.sheet_list && response.data.sheet_list.length > 0) {
        for (const sheet of response.data.sheet_list) {
          const fields = await this.getSheetFields(accessToken, documentId, sheet.sheet_id);
          sheets.push({
            id: sheet.sheet_id,
            name: sheet.title,
            fields
          });
        }
      }

      return sheets;
    } catch (error) {
      Logger.error('获取文档Sheet列表失败', { error: (error as Error).message });
      throw error;
    }
  }

  async getSheetFields(accessToken: string, documentId: string, sheetId: string): Promise<DocumentField[]> {
    try {
      // 获取Sheet的字段信息
      const response = await this.client.post('/cgi-bin/wedoc/smartsheet/get_sheet_property', {
        access_token: accessToken,
        docid: documentId,
        sheet_id: sheetId
      });

      if (response.data.errcode !== 0) {
        throw new Error(`获取Sheet字段失败: ${response.data.errmsg}`);
      }

      let fields: DocumentField[] = [];
      
      if (response.data.property && response.data.property.columns) {
        fields = response.data.property.columns.map((col: any) => ({
          id: col.column_id,
          name: col.title,
          type: this.mapFieldType(col.type)
        }));
      }

      return fields;
    } catch (error) {
      Logger.error('获取Sheet字段失败', { error: (error as Error).message });
      throw error;
    }
  }

  private mapFieldType(type: number): string {
    const typeMap: Record<number, string> = {
      1: 'text',
      2: 'number',
      3: 'date',
      4: 'datetime',
      5: 'boolean',
      6: 'select',
      7: 'multi_select',
      8: 'url',
      9: 'email',
      10: 'phone'
    };
    
    return typeMap[type] || 'text';
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

  async clearSheetData(accessToken: string, documentId: string, sheetId: string): Promise<boolean> {
    try {
      const response = await this.client.post('/cgi-bin/wedoc/smartsheet/clear_sheet', {
        access_token: accessToken,
        docid: documentId,
        sheet_id: sheetId
      });

      if (response.data.errcode !== 0) {
        throw new Error(`清空Sheet数据失败: ${response.data.errmsg}`);
      }

      return true;
    } catch (error) {
      Logger.error('清空Sheet数据失败', { error: (error as Error).message });
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
}

// 单例模式
export const weComDocumentService = new WeComDocumentService();
