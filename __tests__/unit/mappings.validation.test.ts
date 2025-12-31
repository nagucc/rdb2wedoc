import { POST } from '@/app/api/mappings/route';
import { NextRequest } from 'next/server';

describe('Mapping Validation Logic', () => {
  describe('Frontend Validation (validateForm)', () => {
    describe('基础字段验证', () => {
      it('应该拒绝空的映射名称', () => {
        const formData = {
          name: '',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ]
        };
        
        const result = validateFormMock(formData);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('映射名称不能为空');
      });

      it('应该拒绝未选择数据库', () => {
        const formData = {
          name: 'test',
          selectedDatabase: null,
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '请选择数据库' });
      });

      it('应该拒绝未选择表', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: null,
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '请选择表' });
      });

      it('应该拒绝未选择企业微信账户', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: null,
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '请选择企业微信账户' });
      });

      it('应该拒绝未选择智能文档', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: null,
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '请选择智能文档' });
      });

      it('应该拒绝未选择子表', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: null,
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '请选择子表' });
      });

      it('应该拒绝空的字段映射列表', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: []
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '至少需要添加一个字段映射' });
      });
    });

    describe('字段映射验证', () => {
      it('应该拒绝空的源字段', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: '',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '第 1 个字段映射的源字段不能为空' });
      });

      it('应该拒绝空的目标字段', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: '',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '第 1 个字段映射的目标字段不能为空' });
      });

      it('应该拒绝重复的源字段映射', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            },
            {
              id: '2',
              sourceField: 'field1',
              targetField: 'target2',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true },
            { name: 'field2', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' },
            { id: 'target2', name: 'Target 2', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '源字段 "field1" 被重复映射' });
      });

      it('应该拒绝重复的目标字段映射', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            },
            {
              id: '2',
              sourceField: 'field2',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true },
            { name: 'field2', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' },
            { id: 'target2', name: 'Target 2', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '目标字段 "target1" 被重复映射' });
      });

      it('应该拒绝不存在的源字段', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'nonexistent',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '源字段 "nonexistent" 在数据库表中不存在' });
      });

      it('应该拒绝不存在的目标字段', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'nonexistent',
              dataType: 'string',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '目标字段 "nonexistent" 在文档中不存在' });
      });
    });

    describe('数据类型验证', () => {
      it('应该拒绝无效的数据类型', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'invalid_type',
              required: false,
              transformRule: '',
              defaultValue: ''
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '第 1 个字段映射的数据类型 "invalid_type" 无效' });
      });

      it('应该接受有效的数据类型', () => {
        const validDataTypes = ['string', 'number', 'date', 'boolean', 'json'];
        
        validDataTypes.forEach(dataType => {
          const formData = {
            name: 'test',
            selectedDatabase: 'db1',
            selectedTable: 'table1',
            selectedWeComAccount: 'account1',
            selectedDocument: 'doc1',
            selectedSheet: 'sheet1',
            fieldMappings: [
              {
                id: '1',
                sourceField: 'field1',
                targetField: 'target1',
                dataType: dataType,
                required: false,
                transformRule: '',
                defaultValue: ''
              }
            ],
            databaseFields: [
              { name: 'field1', type: 'varchar', nullable: true }
            ],
            documentFields: [
              { id: 'target1', name: 'Target 1', type: 'text' }
            ]
          };
          
          expect(validateFormMock(formData)).toEqual({ valid: true, error: null });
        });
      });
    });

    describe('转换规则验证', () => {
      it('应该拒绝无效的转换规则', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: 'invalid_transform',
              defaultValue: ''
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '第 1 个字段映射的转换规则 "invalid_transform" 无效' });
      });

      it('应该接受有效的转换规则', () => {
        const validTransforms = ['trim', 'toUpperCase', 'toLowerCase', 'toDate', 'toNumber', 'toString', 'toBoolean'];
        
        validTransforms.forEach(transform => {
          const formData = {
            name: 'test',
            selectedDatabase: 'db1',
            selectedTable: 'table1',
            selectedWeComAccount: 'account1',
            selectedDocument: 'doc1',
            selectedSheet: 'sheet1',
            fieldMappings: [
              {
                id: '1',
                sourceField: 'field1',
                targetField: 'target1',
                dataType: 'string',
                required: false,
                transformRule: transform,
                defaultValue: ''
              }
            ],
            databaseFields: [
              { name: 'field1', type: 'varchar', nullable: true }
            ],
            documentFields: [
              { id: 'target1', name: 'Target 1', type: 'text' }
            ]
          };
          
          expect(validateFormMock(formData)).toEqual({ valid: true, error: null });
        });
      });
    });

    describe('默认值验证', () => {
      it('应该拒绝不符合number类型的默认值', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'number',
              required: false,
              transformRule: '',
              defaultValue: 'not_a_number'
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '第 1 个字段映射的默认值 "not_a_number" 不符合数据类型 number 的要求' });
      });

      it('应该拒绝不符合boolean类型的默认值', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'boolean',
              required: false,
              transformRule: '',
              defaultValue: 'not_a_boolean'
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '第 1 个字段映射的默认值 "not_a_boolean" 不符合数据类型 boolean 的要求' });
      });

      it('应该拒绝不符合date类型的默认值', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'date',
              required: false,
              transformRule: '',
              defaultValue: 'not_a_date'
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '第 1 个字段映射的默认值 "not_a_date" 不符合数据类型 date 的要求' });
      });

      it('应该拒绝不符合json类型的默认值', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'json',
              required: false,
              transformRule: '',
              defaultValue: 'not_json'
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '第 1 个字段映射的默认值 "not_json" 不符合数据类型 json 的要求' });
      });

      it('应该接受有效的number默认值', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'number',
              required: false,
              transformRule: '',
              defaultValue: '123'
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: true, error: null });
      });

      it('应该接受有效的boolean默认值', () => {
        const validBooleanValues = ['true', 'false', '1', '0'];
        
        validBooleanValues.forEach(value => {
          const formData = {
            name: 'test',
            selectedDatabase: 'db1',
            selectedTable: 'table1',
            selectedWeComAccount: 'account1',
            selectedDocument: 'doc1',
            selectedSheet: 'sheet1',
            fieldMappings: [
              {
                id: '1',
                sourceField: 'field1',
                targetField: 'target1',
                dataType: 'boolean',
                required: false,
                transformRule: '',
                defaultValue: value
              }
            ],
            databaseFields: [
              { name: 'field1', type: 'varchar', nullable: true }
            ],
            documentFields: [
              { id: 'target1', name: 'Target 1', type: 'text' }
            ]
          };
          
          expect(validateFormMock(formData)).toEqual({ valid: true, error: null });
        });
      });

      it('应该接受有效的date默认值', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'date',
              required: false,
              transformRule: '',
              defaultValue: '2024-01-01'
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: true, error: null });
      });

      it('应该接受有效的json默认值', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'json',
              required: false,
              transformRule: '',
              defaultValue: '{"key":"value"}'
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: true, error: null });
      });
    });

    describe('必填字段验证', () => {
      it('应该拒绝必填但源字段不可为空且未设置默认值的情况', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: true,
              transformRule: '',
              defaultValue: ''
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: false }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: false, error: '第 1 个字段映射标记为必填，但源字段不可为空且未设置默认值' });
      });

      it('应该接受必填但源字段可为空的情况', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: true,
              transformRule: '',
              defaultValue: ''
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: true, error: null });
      });

      it('应该接受必填但设置了默认值的情况', () => {
        const formData = {
          name: 'test',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: true,
              transformRule: '',
              defaultValue: 'default'
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: false }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: true, error: null });
      });
    });

    describe('完整验证测试', () => {
      it('应该接受完整的有效映射配置', () => {
        const formData = {
          name: 'test_mapping',
          selectedDatabase: 'db1',
          selectedTable: 'table1',
          selectedWeComAccount: 'account1',
          selectedDocument: 'doc1',
          selectedSheet: 'sheet1',
          fieldMappings: [
            {
              id: '1',
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string',
              required: false,
              transformRule: 'trim',
              defaultValue: ''
            },
            {
              id: '2',
              sourceField: 'field2',
              targetField: 'target2',
              dataType: 'number',
              required: true,
              transformRule: 'toNumber',
              defaultValue: '0'
            }
          ],
          databaseFields: [
            { name: 'field1', type: 'varchar', nullable: true },
            { name: 'field2', type: 'int', nullable: false }
          ],
          documentFields: [
            { id: 'target1', name: 'Target 1', type: 'text' },
            { id: 'target2', name: 'Target 2', type: 'number' }
          ]
        };
        
        expect(validateFormMock(formData)).toEqual({ valid: true, error: null });
      });
    });
  });

  describe('Backend API Validation', () => {
    it('应该拒绝缺少必要参数的请求', async () => {
      const request = new NextRequest('http://localhost:3000/api/mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test',
          sourceDatabaseId: 'db1',
          sourceTableName: 'table1',
          targetDocId: 'doc1',
          targetSheetId: 'sheet1'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('缺少必要参数');
    });

    it('应该拒绝空的映射名称', async () => {
      const request = new NextRequest('http://localhost:3000/api/mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: '   ',
          sourceDatabaseId: 'db1',
          sourceTableName: 'table1',
          targetDocId: 'doc1',
          targetSheetId: 'sheet1',
          fieldMappings: [
            {
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string'
            }
          ]
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('映射名称不能为空');
    });

    it('应该拒绝空的字段映射数组', async () => {
      const request = new NextRequest('http://localhost:3000/api/mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test',
          sourceDatabaseId: 'db1',
          sourceTableName: 'table1',
          targetDocId: 'doc1',
          targetSheetId: 'sheet1',
          fieldMappings: []
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('字段映射必须是非空数组');
    });

    it('应该拒绝无效的状态值', async () => {
      const request = new NextRequest('http://localhost:3000/api/mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test',
          sourceDatabaseId: 'db1',
          sourceTableName: 'table1',
          targetDocId: 'doc1',
          targetSheetId: 'sheet1',
          fieldMappings: [
            {
              sourceField: 'field1',
              targetField: 'target1',
              dataType: 'string'
            }
          ],
          status: 'invalid'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('无效的状态');
    });

    it('应该拒绝重复的源字段映射', async () => {
      const request = new NextRequest('http://localhost:3000/api/mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test',
          sourceDatabaseId: 'db1',
          sourceTableName: 'table1',
          targetDocId: 'doc1',
          targetSheetId: 'sheet1',
          fieldMappings: [
            {
              databaseColumn: 'field1',
              documentField: 'target1',
              dataType: 'string'
            },
            {
              databaseColumn: 'field1',
              documentField: 'target2',
              dataType: 'string'
            }
          ]
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('源字段 "field1" 被重复映射');
    });

    it('应该拒绝重复的目标字段映射', async () => {
      const request = new NextRequest('http://localhost:3000/api/mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test',
          sourceDatabaseId: 'db1',
          sourceTableName: 'table1',
          targetDocId: 'doc1',
          targetSheetId: 'sheet1',
          fieldMappings: [
            {
              databaseColumn: 'field1',
              documentField: 'target1',
              dataType: 'string'
            },
            {
              databaseColumn: 'field2',
              documentField: 'target1',
              dataType: 'string'
            }
          ]
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('目标字段 "target1" 被重复映射');
    });

    it('应该拒绝无效的数据类型', async () => {
      const request = new NextRequest('http://localhost:3000/api/mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test',
          sourceDatabaseId: 'db1',
          sourceTableName: 'table1',
          targetDocId: 'doc1',
          targetSheetId: 'sheet1',
          fieldMappings: [
            {
              databaseColumn: 'field1',
              documentField: 'target1',
              dataType: 'invalid'
            }
          ]
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('数据类型无效');
    });

    it('应该拒绝无效的转换规则', async () => {
      const request = new NextRequest('http://localhost:3000/api/mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test',
          sourceDatabaseId: 'db1',
          sourceTableName: 'table1',
          targetDocId: 'doc1',
          targetSheetId: 'sheet1',
          fieldMappings: [
            {
              databaseColumn: 'field1',
              documentField: 'target1',
              dataType: 'string',
              transform: 'invalid'
            }
          ]
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('转换规则 "invalid" 无效');
    });

    it('应该拒绝不符合数据类型的默认值', async () => {
      const request = new NextRequest('http://localhost:3000/api/mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test',
          sourceDatabaseId: 'db1',
          sourceTableName: 'table1',
          targetDocId: 'doc1',
          targetSheetId: 'sheet1',
          fieldMappings: [
            {
              databaseColumn: 'field1',
              documentField: 'target1',
              dataType: 'number',
              defaultValue: 'not_a_number'
            }
          ]
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('默认值 "not_a_number" 不符合数据类型 number 的要求');
    });
  });
});

function validateFormMock(formData: any): { valid: boolean; error: string | null } {
  if (!formData.name.trim()) {
    return { valid: false, error: '映射名称不能为空' };
  }

  if (!formData.selectedDatabase) {
    return { valid: false, error: '请选择数据库' };
  }
  if (!formData.selectedTable) {
    return { valid: false, error: '请选择表' };
  }

  if (!formData.selectedWeComAccount) {
    return { valid: false, error: '请选择企业微信账户' };
  }
  if (!formData.selectedDocument) {
    return { valid: false, error: '请选择智能文档' };
  }
  if (!formData.selectedSheet) {
    return { valid: false, error: '请选择子表' };
  }

  if (formData.fieldMappings.length === 0) {
    return { valid: false, error: '至少需要添加一个字段映射' };
  }

  const sourceFieldSet = new Set<string>();
  const targetFieldSet = new Set<string>();

  for (let i = 0; i < formData.fieldMappings.length; i++) {
    const mapping = formData.fieldMappings[i];

    if (!mapping.sourceField.trim()) {
      return { valid: false, error: `第 ${i + 1} 个字段映射的源字段不能为空` };
    }
    if (!mapping.targetField.trim()) {
      return { valid: false, error: `第 ${i + 1} 个字段映射的目标字段不能为空` };
    }

    const sourceField = mapping.sourceField.trim();
    const targetField = mapping.targetField.trim();

    if (sourceFieldSet.has(sourceField)) {
      return { valid: false, error: `源字段 "${sourceField}" 被重复映射` };
    }
    sourceFieldSet.add(sourceField);

    if (targetFieldSet.has(targetField)) {
      return { valid: false, error: `目标字段 "${targetField}" 被重复映射` };
    }
    targetFieldSet.add(targetField);

    const dbField = formData.databaseFields?.find((f: any) => f.name === sourceField);
    if (!dbField) {
      return { valid: false, error: `源字段 "${sourceField}" 在数据库表中不存在` };
    }

    const docField = formData.documentFields?.find((f: any) => f.id === targetField);
    if (!docField) {
      return { valid: false, error: `目标字段 "${targetField}" 在文档中不存在` };
    }

    const validDataTypes = ['string', 'number', 'date', 'boolean', 'json'];
    if (!validDataTypes.includes(mapping.dataType)) {
      return { valid: false, error: `第 ${i + 1} 个字段映射的数据类型 "${mapping.dataType}" 无效` };
    }

    if (mapping.required && !dbField.nullable && !mapping.defaultValue) {
      return { valid: false, error: `第 ${i + 1} 个字段映射标记为必填，但源字段不可为空且未设置默认值` };
    }

    if (mapping.transformRule) {
      const validTransforms = ['trim', 'toUpperCase', 'toLowerCase', 'toDate', 'toNumber', 'toString', 'toBoolean'];
      if (!validTransforms.includes(mapping.transformRule)) {
        return { valid: false, error: `第 ${i + 1} 个字段映射的转换规则 "${mapping.transformRule}" 无效` };
      }
    }

    if (mapping.defaultValue) {
      if (!validateDefaultValueMock(mapping.defaultValue, mapping.dataType)) {
        return { valid: false, error: `第 ${i + 1} 个字段映射的默认值 "${mapping.defaultValue}" 不符合数据类型 ${mapping.dataType} 的要求` };
      }
    }
  }

  return { valid: true, error: null };
}

function validateDefaultValueMock(value: string, dataType: string): boolean {
  if (!value) return true;

  try {
    switch (dataType) {
      case 'number':
        return !isNaN(Number(value));
      case 'boolean':
        return ['true', 'false', '1', '0'].includes(value.toLowerCase());
      case 'date':
        return !isNaN(Date.parse(value));
      case 'json':
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      case 'string':
      default:
        return true;
    }
  } catch {
    return false;
  }
}
