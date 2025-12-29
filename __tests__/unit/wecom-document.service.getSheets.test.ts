/**
 * WeComDocumentService - getDocumentSheets 方法单元测试
 * 
 * 测试范围：
 * 本测试文件专注于验证 WeComDocumentService 的 getDocumentSheets 方法，
 * 包括API调用方式、请求参数、响应处理和Sheet筛选逻辑。
 * 
 * 测试目标：
 * - 验证API调用符合官方文档规范（POST方法、正确的请求体格式）
 * - 确保请求参数正确传递（docid、need_all_type_sheet）
 * - 验证access_token正确配置在URL参数中
 * - 确保响应数据结构正确解析
 * - 验证Sheet筛选逻辑（is_visible=true且type=smartsheet）
 * 
 * 核心功能验证点：
 * 1. API调用方式：使用POST方法而非GET
 * 2. 请求体格式：包含docid和need_all_type_sheet参数
 * 3. 认证方式：access_token作为URL查询参数
 * 4. 响应处理：正确解析errcode、errmsg和sheet_list
 * 5. Sheet筛选：只返回is_visible=true且type=smartsheet的Sheet
 * 
 * 关键测试场景：
 * - 成功获取Sheet列表
 * - 筛选符合条件的Sheet
 * - API返回错误码时的处理
 * - 网络错误时的处理
 * - 空Sheet列表的处理
 * - 不同类型Sheet的筛选（dashboard、external、smartsheet）
 * 
 * 预期结果：
 * 所有测试用例应通过，确保getDocumentSheets方法在各种场景下都能正常工作。
 */

import axios from 'axios';
import { WeComDocumentService } from '@/lib/services/wecom-document.service';

jest.mock('axios');

describe('WeComDocumentService - getDocumentSheets', () => {
  let service: WeComDocumentService;
  let mockPost: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPost = jest.fn();
    mockGet = jest.fn();
    
    (axios.create as jest.Mock).mockReturnValue({
      post: mockPost,
      get: mockGet
    });
    
    service = new WeComDocumentService();
  });

  describe('API调用方式验证', () => {
    it('应该使用POST方法调用API', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          sheet_list: []
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      await service.getDocumentSheets('test_token', 'test_docid');

      expect(mockPost).toHaveBeenCalledWith(
        '/cgi-bin/wedoc/smartsheet/get_sheet',
        expect.objectContaining({
          docid: 'test_docid',
          need_all_type_sheet: true
        }),
        expect.objectContaining({
          params: expect.objectContaining({
            access_token: 'test_token'
          })
        })
      );
    });

    it('不应该使用GET方法调用API', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          sheet_list: []
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      await service.getDocumentSheets('test_token', 'test_docid');

      expect(mockGet).not.toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalled();
    });
  });

  describe('请求参数验证', () => {
    it('应该在请求体中包含docid参数', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          sheet_list: []
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      await service.getDocumentSheets('test_token', 'doc123');

      expect(mockPost).toHaveBeenCalledWith(
        '/cgi-bin/wedoc/smartsheet/get_sheet',
        expect.objectContaining({
          docid: 'doc123'
        }),
        expect.any(Object)
      );
    });

    it('应该在请求体中包含need_all_type_sheet参数并设置为true', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          sheet_list: []
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      await service.getDocumentSheets('test_token', 'doc123');

      expect(mockPost).toHaveBeenCalledWith(
        '/cgi-bin/wedoc/smartsheet/get_sheet',
        expect.objectContaining({
          need_all_type_sheet: true
        }),
        expect.any(Object)
      );
    });

    it('应该在URL参数中包含access_token', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          sheet_list: []
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      await service.getDocumentSheets('token123', 'doc123');

      expect(mockPost).toHaveBeenCalledWith(
        '/cgi-bin/wedoc/smartsheet/get_sheet',
        expect.any(Object),
        expect.objectContaining({
          params: expect.objectContaining({
            access_token: 'token123'
          })
        })
      );
    });
  });

  describe('响应处理验证', () => {
    it('应该正确处理成功的API响应', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          sheet_list: [
            {
              sheet_id: 'sheet1',
              title: 'Sheet 1',
              is_visible: true,
              type: 'smartsheet'
            }
          ]
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await service.getDocumentSheets('test_token', 'doc123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'sheet1',
        name: 'Sheet 1',
        fields: []
      });
    });

    it('应该正确处理API返回的错误码', async () => {
      const mockResponse = {
        data: {
          errcode: 40001,
          errmsg: 'invalid credential',
          sheet_list: []
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      await expect(service.getDocumentSheets('test_token', 'doc123'))
        .rejects.toThrow('获取Sheet列表失败 (errcode: 40001): invalid credential');
    });

    it('应该正确处理网络错误', async () => {
      const mockError = new Error('Network Error');
      (mockError as any).response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {}
      };
      mockPost.mockRejectedValue(mockError);

      await expect(service.getDocumentSheets('test_token', 'doc123'))
        .rejects.toThrow('Network Error');
    });
  });

  describe('Sheet筛选逻辑验证', () => {
    it('应该只返回is_visible为true且type为smartsheet的Sheet', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          sheet_list: [
            {
              sheet_id: 'sheet1',
              title: 'Smart Sheet 1',
              is_visible: true,
              type: 'smartsheet'
            },
            {
              sheet_id: 'sheet2',
              title: 'Dashboard 1',
              is_visible: true,
              type: 'dashboard'
            },
            {
              sheet_id: 'sheet3',
              title: 'External Page 1',
              is_visible: true,
              type: 'external'
            },
            {
              sheet_id: 'sheet4',
              title: 'Hidden Sheet',
              is_visible: false,
              type: 'smartsheet'
            }
          ]
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await service.getDocumentSheets('test_token', 'doc123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sheet1');
      expect(result[0].name).toBe('Smart Sheet 1');
    });

    it('应该正确筛选多个符合条件的Sheet', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          sheet_list: [
            {
              sheet_id: 'sheet1',
              title: 'Smart Sheet 1',
              is_visible: true,
              type: 'smartsheet'
            },
            {
              sheet_id: 'sheet2',
              title: 'Smart Sheet 2',
              is_visible: true,
              type: 'smartsheet'
            },
            {
              sheet_id: 'sheet3',
              title: 'Smart Sheet 3',
              is_visible: true,
              type: 'smartsheet'
            },
            {
              sheet_id: 'sheet4',
              title: 'Dashboard 1',
              is_visible: true,
              type: 'dashboard'
            }
          ]
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await service.getDocumentSheets('test_token', 'doc123');

      expect(result).toHaveLength(3);
      expect(result.map(s => s.id)).toEqual(['sheet1', 'sheet2', 'sheet3']);
    });

    it('应该正确处理空Sheet列表', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          sheet_list: []
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await service.getDocumentSheets('test_token', 'doc123');

      expect(result).toHaveLength(0);
    });

    it('应该正确处理没有符合条件的Sheet', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          sheet_list: [
            {
              sheet_id: 'sheet1',
              title: 'Dashboard 1',
              is_visible: true,
              type: 'dashboard'
            },
            {
              sheet_id: 'sheet2',
              title: 'External Page 1',
              is_visible: true,
              type: 'external'
            },
            {
              sheet_id: 'sheet3',
              title: 'Hidden Sheet',
              is_visible: false,
              type: 'smartsheet'
            }
          ]
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await service.getDocumentSheets('test_token', 'doc123');

      expect(result).toHaveLength(0);
    });
  });

  describe('边界条件测试', () => {
    it('应该正确处理响应中缺少sheet_list字段', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok'
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await service.getDocumentSheets('test_token', 'doc123');

      expect(result).toHaveLength(0);
    });

    it('应该正确处理sheet_list为null的情况', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          sheet_list: null
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await service.getDocumentSheets('test_token', 'doc123');

      expect(result).toHaveLength(0);
    });
  });
});
