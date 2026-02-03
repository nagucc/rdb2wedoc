/**
 * MongoDB to 2D Table Mapping Skill - Unit Tests
 * 
 * Comprehensive test suite for the mapping functionality.
 */

import {
  MongoDBToTableMapper,
  createMapper,
  mapMongoDBToTable,
  quickMap,
  quickExport,
  exportToCSV,
  exportToJSON,
  exportToArray
} from '../src';
import {
  MappingConfig,
  MongoDBDocument,
  TableData,
  FieldMapping,
  TransformRule
} from '../src/types';
import {
  ValidationError,
  ConfigurationError,
  TransformationError
} from '../src/errors';

describe('MongoDBToTableMapper', () => {
  describe('Configuration Validation', () => {
    it('should throw ConfigurationError for null config', () => {
      expect(() => createMapper(null as any)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for empty fieldMappings', () => {
      const config: MappingConfig = {
        mongoMappingType: 'flatten',
        fieldMappings: []
      };
      expect(() => createMapper(config)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for array_expand without mongoArrayField', () => {
      const config: MappingConfig = {
        mongoMappingType: 'array_expand',
        fieldMappings: [{ databaseField: 'test', documentField: 'test' }]
      };
      expect(() => createMapper(config)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for invalid mongoMappingType', () => {
      const config: MappingConfig = {
        mongoMappingType: 'invalid' as any,
        fieldMappings: [{ databaseField: 'test', documentField: 'test' }]
      };
      expect(() => createMapper(config)).toThrow(ConfigurationError);
    });

    it('should throw ValidationError for missing databaseField', () => {
      const config: MappingConfig = {
        mongoMappingType: 'flatten',
        fieldMappings: [{ databaseField: '', documentField: 'test' } as any]
      };
      expect(() => createMapper(config)).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing documentField', () => {
      const config: MappingConfig = {
        mongoMappingType: 'flatten',
        fieldMappings: [{ databaseField: 'test', documentField: '' } as any]
      };
      expect(() => createMapper(config)).toThrow(ValidationError);
    });
  });

  describe('Input Validation', () => {
    it('should throw ValidationError for non-array input', () => {
      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [{ databaseField: '_id', documentField: 'id' }]
      });
      expect(() => mapper.map(null as any)).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty array input', () => {
      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [{ databaseField: '_id', documentField: 'id' }]
      });
      expect(() => mapper.map([])).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-object documents', () => {
      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [{ databaseField: '_id', documentField: 'id' }]
      });
      expect(() => mapper.map([null as any])).toThrow(ValidationError);
      expect(() => mapper.map(['string'] as any)).toThrow(ValidationError);
    });
  });

  describe('Flatten Mode Mapping', () => {
    it('should map simple fields correctly', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'John', age: 30 }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'name', documentField: 'user_name' },
          { databaseField: 'age', documentField: 'user_age' }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({
        id: 1,
        user_name: 'John',
        user_age: 30
      });
    });

    it('should flatten nested objects', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, user: { profile: { name: 'John', email: 'john@example.com' } } }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'user.profile.name', documentField: 'name' },
          { databaseField: 'user.profile.email', documentField: 'email' }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows[0]).toEqual({
        id: 1,
        name: 'John',
        email: 'john@example.com'
      });
    });

    it('should convert arrays to JSON strings by default', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, tags: ['admin', 'developer', 'ts'] }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'tags', documentField: 'user_tags' }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows[0].user_tags).toBe('["admin","developer","ts"]');
    });

    it('should handle null and undefined values', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'John', age: null }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'name', documentField: 'name' },
          { databaseField: 'age', documentField: 'age' }
        ],
        options: {
          nullValue: 'N/A'
        }
      });

      const result = mapper.map(documents);

      expect(result.rows[0].age).toBe('N/A');
    });

    it('should apply default values for missing fields', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'John' }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'name', documentField: 'name' },
          { databaseField: 'age', documentField: 'age', defaultValue: 25 }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows[0].age).toBe(25);
    });

    it('should exclude buffer fields by default', () => {
      const documents: MongoDBDocument[] = [
        { 
          _id: 1, 
          name: 'John',
          data: { buffer: Buffer.from('test'), normal: 'value' }
        }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: []
      });

      const result = mapper.map(documents);

      expect(result.rows[0]).not.toHaveProperty('data.buffer');
      expect(result.rows[0]).toHaveProperty('data.normal', 'value');
    });

    it('should include all fields when specified', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'John', age: 30, city: 'NYC' }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [],
        options: {
          includeAllFields: true
        }
      });

      const result = mapper.map(documents);

      expect(result.rows[0]).toHaveProperty('_id', 1);
      expect(result.rows[0]).toHaveProperty('name', 'John');
      expect(result.rows[0]).toHaveProperty('age', 30);
      expect(result.rows[0]).toHaveProperty('city', 'NYC');
    });
  });

  describe('Array Expand Mode Mapping', () => {
    it('should expand array elements to separate rows', () => {
      const documents: MongoDBDocument[] = [
        {
          _id: 'doc1',
          title: 'First Post',
          comments: [
            { user: 'Alice', text: 'Great!' },
            { user: 'Bob', text: 'Nice!' }
          ]
        }
      ];

      const mapper = createMapper({
        mongoMappingType: 'array_expand',
        mongoArrayField: 'comments',
        fieldMappings: [
          { databaseField: '_id', documentField: 'post_id' },
          { databaseField: 'title', documentField: 'post_title' },
          { databaseField: 'comments.user', documentField: 'comment_user' },
          { databaseField: 'comments.text', documentField: 'comment_text' }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        post_id: 'doc1',
        post_title: 'First Post',
        comment_user: 'Alice',
        comment_text: 'Great!'
      });
      expect(result.rows[1]).toEqual({
        post_id: 'doc1',
        post_title: 'First Post',
        comment_user: 'Bob',
        comment_text: 'Nice!'
      });
    });

    it('should handle primitive array elements', () => {
      const documents: MongoDBDocument[] = [
        {
          _id: 1,
          tags: ['react', 'vue', 'angular']
        }
      ];

      const mapper = createMapper({
        mongoMappingType: 'array_expand',
        mongoArrayField: 'tags',
        fieldMappings: [
          { databaseField: '_id', documentField: 'doc_id' },
          { databaseField: 'tags', documentField: 'tag_value' }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows).toHaveLength(3);
      expect(result.rows.map(r => r.tag_value)).toEqual(['react', 'vue', 'angular']);
    });

    it('should skip documents without the array field when skipInvalidRows is true', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'No Comments Post', content: 'Hello' },
        { _id: 2, comments: [{ text: 'Comment' }] }
      ];

      const mapper = createMapper({
        mongoMappingType: 'array_expand',
        mongoArrayField: 'comments',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'comments.text', documentField: 'comment' }
        ],
        options: {
          skipInvalidRows: true
        }
      });

      const result = mapper.map(documents);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(2);
    });

    it('should throw error for missing array field when skipInvalidRows is false', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'No Comments Post' }
      ];

      const mapper = createMapper({
        mongoMappingType: 'array_expand',
        mongoArrayField: 'comments',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' }
        ],
        options: {
          skipInvalidRows: false
        }
      });

      expect(() => mapper.map(documents)).toThrow(ValidationError);
    });

    it('should handle nested array fields with correct prefix', () => {
      const documents: MongoDBDocument[] = [
        {
          _id: 1,
          metadata: {
            tags: [
              { name: 'important', priority: 1 },
              { name: 'urgent', priority: 2 }
            ]
          }
        }
      ];

      const mapper = createMapper({
        mongoMappingType: 'array_expand',
        mongoArrayField: 'metadata.tags',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'metadata.tags.name', documentField: 'tag_name' },
          { databaseField: 'metadata.tags.priority', documentField: 'priority' }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        id: 1,
        tag_name: 'important',
        priority: 1
      });
    });
  });

  describe('Data Type Transformations', () => {
    it('should transform string to number', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, price: '29.99' }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          {
            databaseField: 'price',
            documentField: 'price_number',
            transform: { type: 'number' }
          }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows[0].price_number).toBe(29.99);
      expect(typeof result.rows[0].price_number).toBe('number');
    });

    it('should transform string to boolean', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, active: 'true' },
        { _id: 2, active: 'false' }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          {
            databaseField: 'active',
            documentField: 'is_active',
            transform: { type: 'boolean' }
          }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows[0].is_active).toBe(true);
      expect(result.rows[1].is_active).toBe(false);
    });

    it('should transform date with different formats', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, created: '2024-03-15T10:30:00.000Z' }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          {
            databaseField: 'created',
            documentField: 'date_iso',
            transform: { type: 'date', format: 'ISO' }
          },
          {
            databaseField: 'created',
            documentField: 'date_simple',
            transform: { type: 'date', format: 'date' }
          },
          {
            databaseField: 'created',
            documentField: 'date_datetime',
            transform: { type: 'date', format: 'datetime' }
          }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows[0].date_iso).toBe('2024-03-15T10:30:00.000Z');
      expect(result.rows[0].date_simple).toBe('2024-03-15');
      expect(result.rows[0].date_datetime).toBe('2024-03-15 10:30:00');
    });

    it('should transform array with custom separator', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, tags: ['react', 'vue', 'angular'] }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          {
            databaseField: 'tags',
            documentField: 'tags_string',
            transform: { type: 'array', format: '|' }
          }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows[0].tags_string).toBe('react|vue|angular');
    });

    it('should handle custom transformation', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'john_doe' }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          {
            databaseField: 'name',
            documentField: 'display_name',
            transform: {
              type: 'custom',
              customTransform: (value: string) => value.replace(/_/g, ' ').toUpperCase()
            }
          }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows[0].display_name).toBe('JOHN DOE');
    });
  });

  describe('Export Functionality', () => {
    const sampleTableData: TableData = {
      columns: [
        { name: 'id', type: 'number', required: true },
        { name: 'name', type: 'string', required: true },
        { name: 'active', type: 'boolean', required: false }
      ],
      rows: [
        { id: 1, name: 'John', active: true },
        { id: 2, name: 'Jane', active: false }
      ],
      metadata: {
        totalRows: 2,
        totalColumns: 3,
        mappingType: 'flatten',
        sourceCollection: 'test_collection',
        generatedAt: '2024-01-01T00:00:00.000Z'
      }
    };

    it('should export to CSV with headers', () => {
      const csv = exportToCSV(sampleTableData);

      expect(csv).toContain('"id","name","active"');
      expect(csv).toContain('"1","John","true"');
      expect(csv).toContain('"2","Jane","false"');
    });

    it('should export to CSV without headers when headers is false', () => {
      const csv = exportToCSV(sampleTableData, { headers: false });

      expect(csv).not.toContain('"id"');
      expect(csv).toContain('"1","John","true"');
    });

    it('should export to JSON with full metadata', () => {
      const json = exportToJSON(sampleTableData);

      const parsed = JSON.parse(json);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.columns).toHaveLength(3);
      expect(parsed.data).toHaveLength(2);
    });

    it('should export to array format', () => {
      const array = exportToArray(sampleTableData);

      const parsed = JSON.parse(array);
      expect(parsed[0]).toEqual(['id', 'name', 'active']);
      expect(parsed[1]).toEqual([1, 'John', true]);
      expect(parsed[2]).toEqual([2, 'Jane', false]);
    });

    it('should handle special characters in CSV', () => {
      const tableData: TableData = {
        columns: [{ name: 'description', type: 'string', required: true }],
        rows: [
          { description: 'Contains, commas' },
          { description: 'Contains "quotes"' },
          { description: 'Contains\nnewline' }
        ],
        metadata: {
          totalRows: 1,
          totalColumns: 1,
          mappingType: 'flatten',
          sourceCollection: 'test',
          generatedAt: '2024-01-01T00:00:00.000Z'
        }
      };

      const csv = exportToCSV(tableData);

      expect(csv).toContain('"Contains, commas"');
      expect(csv).toContain('"Contains ""quotes"""');
      expect(csv).toContain('Contains\nnewline');
    });
  });

  describe('Error Handling', () => {
    it('should collect errors without throwing when skipInvalidRows is true', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'Valid' },
        { name: 'Missing ID' }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id', required: true },
          { databaseField: 'name', documentField: 'name' }
        ],
        options: {
          skipInvalidRows: true
        }
      });

      const result = mapper.map(documents);

      expect(result.rows).toHaveLength(1);
      expect(mapper.hasErrors()).toBe(true);
      expect(mapper.getErrors().length).toBeGreaterThan(0);
    });

    it('should throw TransformationError for required missing fields', () => {
      const documents: MongoDBDocument[] = [
        { name: 'Missing ID' }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id', required: true },
          { databaseField: 'name', documentField: 'name' }
        ],
        options: {
          skipInvalidRows: false
        }
      });

      expect(() => mapper.map(documents)).toThrow(TransformationError);
    });

    it('should return processing stats', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'John' }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'name', documentField: 'name' }
        ]
      });

      mapper.map(documents);
      const stats = mapper.getStats();

      expect(stats.totalDocuments).toBe(1);
      expect(stats.processedRows).toBe(1);
      expect(stats.errorCount).toBe(0);
    });
  });

  describe('Quick API', () => {
    it('should work with quickMap', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'John', age: 30 }
      ];

      const result = quickMap(documents, {
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'name', documentField: 'name' }
        ]
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({ id: 1, name: 'John' });
    });

    it('should work with quickExport', () => {
      const tableData: TableData = {
        columns: [{ name: 'id', type: 'number', required: true }],
        rows: [{ id: 1 }],
        metadata: {
          totalRows: 1,
          totalColumns: 1,
          mappingType: 'flatten',
          sourceCollection: 'test',
          generatedAt: new Date().toISOString()
        }
      };

      const csv = quickExport(tableData, 'csv');
      expect(csv).toContain('"1"');
    });
  });

  describe('Column Inference', () => {
    it('should infer column types correctly', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'John', age: 30, active: true, score: 95.5 }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [],
        options: {
          includeAllFields: true
        }
      });

      const result = mapper.map(documents);
      const columns = result.columns;

      expect(columns.find(c => c.name === '_id')?.type).toBe('number');
      expect(columns.find(c => c.name === 'name')?.type).toBe('string');
      expect(columns.find(c => c.name === 'age')?.type).toBe('number');
      expect(columns.find(c => c.name === 'active')?.type).toBe('boolean');
      expect(columns.find(c => c.name === 'score')?.type).toBe('float');
    });

    it('should mark required columns correctly', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, name: 'John' },
        { _id: 2 }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [],
        options: {
          includeAllFields: true
        }
      });

      const result = mapper.map(documents);
      const columns = result.columns;

      expect(columns.find(c => c.name === '_id')?.required).toBe(true);
      expect(columns.find(c => c.name === 'name')?.required).toBe(false);
    });
  });

  describe('Complex Nested Structures', () => {
    it('should handle deeply nested objects', () => {
      const documents: MongoDBDocument[] = [
        {
          _id: 1,
          level1: {
            level2: {
              level3: {
                level4: {
                  value: 'deep nested value'
                }
              }
            }
          }
        }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'level1.level2.level3.level4.value', documentField: 'value' }
        ]
      });

      const result = mapper.map(documents);

      expect(result.rows[0].value).toBe('deep nested value');
    });

    it('should handle mixed array and object structures', () => {
      const documents: MongoDBDocument[] = [
        {
          _id: 1,
          users: [
            { name: 'John', scores: [90, 85] },
            { name: 'Jane', scores: [88, 92] }
          ]
        }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: [
          { databaseField: '_id', documentField: 'id' },
          { databaseField: 'users', documentField: 'users_json' }
        ]
      });

      const result = mapper.map(documents);

      const expectedUsers = JSON.stringify([
        { name: 'John', scores: [90, 85] },
        { name: 'Jane', scores: [88, 92] }
      ]);
      expect(result.rows[0].users_json).toBe(expectedUsers);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty objects', () => {
      const documents: MongoDBDocument[] = [
        { _id: 1, empty: {} }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: []
      });

      const result = mapper.map(documents);

      expect(result.rows[0]).toHaveProperty('empty');
    });

    it('should handle objects with many properties', () => {
      const doc: any = { _id: 1 };
      for (let i = 0; i < 100; i++) {
        doc[`field_${i}`] = `value_${i}`;
      }

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: []
      });

      const result = mapper.map([doc]);

      expect(Object.keys(result.rows[0])).toHaveLength(101);
    });

    it('should handle special field names', () => {
      const documents: MongoDBDocument[] = [
        { 
          _id: 1, 
          '$special': 'dollar',
          'with space': 'space',
          'with.dots': 'dots'
        }
      ];

      const mapper = createMapper({
        mongoMappingType: 'flatten',
        fieldMappings: []
      });

      const result = mapper.map(documents);

      expect(result.rows[0]).toHaveProperty('$special', 'dollar');
      expect(result.rows[0]).toHaveProperty('with space', 'space');
      expect(result.rows[0]).toHaveProperty('with.dots', 'dots');
    });
  });
});

describe('Integration Tests', () => {
  it('should handle real-world document structure', () => {
    const documents: MongoDBDocument[] = [
      {
        _id: '507f1f77bcf86cd799439011',
        title: 'Introduction to TypeScript',
        author: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        },
        tags: ['typescript', 'javascript', 'programming'],
        metadata: {
          views: 1500,
          likes: 75,
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-20')
        },
        comments: [
          { user: 'Alice', text: 'Great article!', rating: 5 },
          { user: 'Bob', text: 'Very helpful, thanks!', rating: 4 }
        ],
        status: 'published'
      }
    ];

    const mapper = createMapper({
      mongoMappingType: 'array_expand',
      mongoArrayField: 'comments',
      fieldMappings: [
        { databaseField: '_id', documentField: 'article_id' },
        { databaseField: 'title', documentField: 'title' },
        { databaseField: 'author.name', documentField: 'author' },
        { databaseField: 'tags', documentField: 'tags_json' },
        { databaseField: 'metadata.views', documentField: 'views' },
        {
          databaseField: 'metadata.created_at',
          documentField: 'published_date',
          transform: { type: 'date', format: 'date' }
        },
        { databaseField: 'comments.user', documentField: 'commenter' },
        { databaseField: 'comments.text', documentField: 'comment' },
        { databaseField: 'comments.rating', documentField: 'rating' }
      ]
    });

    const result = mapper.map(documents);

    expect(result.rows).toHaveLength(2);
    expect(result.columns.map(c => c.name)).toContain('article_id');
    expect(result.columns.map(c => c.name)).toContain('title');
    expect(result.columns.map(c => c.name)).toContain('tags_json');
    
    expect(result.rows[0].commenter).toBe('Alice');
    expect(result.rows[0].rating).toBe(5);
    expect(result.rows[1].commenter).toBe('Bob');
    expect(result.rows[1].rating).toBe(4);
  });
});
