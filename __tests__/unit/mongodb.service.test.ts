import { describe, expect, it } from '@jest/globals';
import { DatabaseService } from '@/lib/services/database.service';
import { DatabaseConnection } from '@/types';

describe('MongoDB Database Service', () => {
  describe('BSON Type Inference', () => {
    it('should infer string type correctly', () => {
      const service = new DatabaseService();
      
      expect((service as any).inferBSONType('test')).toBe('string');
      expect((service as any).inferBSONType('')).toBe('string');
    });

    it('should infer integer type correctly', () => {
      const service = new DatabaseService();
      
      expect((service as any).inferBSONType(42)).toBe('int64');
      expect((service as any).inferBSONType(0)).toBe('int64');
      expect((service as any).inferBSONType(-1)).toBe('int64');
    });

    it('should infer double type correctly', () => {
      const service = new DatabaseService();
      
      expect((service as any).inferBSONType(3.14)).toBe('double');
      expect((service as any).inferBSONType(1.5)).toBe('double');
    });

    it('should infer boolean type correctly', () => {
      const service = new DatabaseService();
      
      expect((service as any).inferBSONType(true)).toBe('bool');
      expect((service as any).inferBSONType(false)).toBe('bool');
    });

    it('should infer null type correctly', () => {
      const service = new DatabaseService();
      
      expect((service as any).inferBSONType(null)).toBe('null');
    });

    it('should infer undefined type correctly', () => {
      const service = new DatabaseService();
      
      expect((service as any).inferBSONType(undefined)).toBe('undefined');
    });

    it('should infer date type correctly', () => {
      const service = new DatabaseService();
      const date = new Date();
      
      expect((service as any).inferBSONType(date)).toBe('date');
    });

    it('should infer object type correctly', () => {
      const service = new DatabaseService();
      
      expect((service as any).inferBSONType({})).toBe('object');
      expect((service as any).inferBSONType({ key: 'value' })).toBe('object');
    });

    it('should infer binData type correctly', () => {
      const service = new DatabaseService();
      const buffer = Buffer.from('test');
      
      expect((service as any).inferBSONType(buffer)).toBe('binData');
    });

    it('should infer mixed type for unknown types', () => {
      const service = new DatabaseService();
      const symbol = Symbol('test');
      
      expect((service as any).inferBSONType(symbol)).toBe('mixed');
    });
  });

  describe('Field Extraction from Documents', () => {
    it('should extract fields from simple document', () => {
      const service = new DatabaseService();
      const fieldMap = new Map<string, { type: string }>();
      
      (service as any).extractFields('', { name: 'John', age: 30 }, fieldMap);
      
      expect(fieldMap.has('name')).toBe(true);
      expect(fieldMap.has('age')).toBe(true);
      expect(fieldMap.get('name')?.type).toBe('string');
      expect(fieldMap.get('age')?.type).toBe('int64');
    });

    it('should extract nested fields correctly', () => {
      const service = new DatabaseService();
      const fieldMap = new Map<string, { type: string }>();
      
      (service as any).extractFields('', { 
        user: { 
          name: 'John',
          address: { 
            city: 'Beijing',
            zip: '100000'
          }
        }
      }, fieldMap);
      
      expect(fieldMap.has('user.name')).toBe(true);
      expect(fieldMap.has('user.address.city')).toBe(true);
      expect(fieldMap.has('user.address.zip')).toBe(true);
    });

    it('should handle arrays correctly', () => {
      const service = new DatabaseService();
      const fieldMap = new Map<string, { type: string }>();
      
      (service as any).extractFields('', { 
        tags: ['admin', 'user']
      }, fieldMap);
      
      expect(fieldMap.has('tags')).toBe(true);
      expect(fieldMap.has('tags[]')).toBe(true);
    });

    it('should handle empty documents', () => {
      const service = new DatabaseService();
      
      const result = (service as any).inferFieldsFromDocuments([]);
      
      expect(result).toEqual([]);
    });

    it('should handle null and undefined documents', () => {
      const service = new DatabaseService();
      const fieldMap = new Map<string, { type: string }>();
      
      (service as any).extractFields('', null, fieldMap);
      (service as any).extractFields('', undefined, fieldMap);
      
      expect(fieldMap.size).toBe(0);
    });
  });

  describe('MongoDB URI Building', () => {
    it('should build correct MongoDB URI without replica set', () => {
      const service = new DatabaseService();
      
      const config: DatabaseConnection = {
        id: 'test',
        name: 'test',
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        username: 'admin',
        password: 'password123',
        database: 'testdb',
        mongoOptions: { authSource: 'admin' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const uri = (service as any).buildMongoURI(config);
      
      expect(uri).toBe('mongodb://admin:password123@localhost:27017/testdb?authSource=admin');
    });

    it('should build correct MongoDB URI with replica set', () => {
      const service = new DatabaseService();
      
      const config: DatabaseConnection = {
        id: 'test',
        name: 'test',
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        username: 'admin',
        password: 'password123',
        database: 'testdb',
        mongoOptions: { 
          authSource: 'admin',
          replicaSet: 'rs0'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const uri = (service as any).buildMongoURI(config);
      
      expect(uri).toBe('mongodb://admin:password123@localhost:27017/testdb?authSource=admin&replicaSet=rs0');
    });

    it('should use default authSource when not specified', () => {
      const service = new DatabaseService();
      
      const config: DatabaseConnection = {
        id: 'test',
        name: 'test',
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        username: 'admin',
        password: 'password123',
        database: 'testdb',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const uri = (service as any).buildMongoURI(config);
      
      expect(uri).toContain('authSource=admin');
    });

    it('should encode special characters in username and password', () => {
      const service = new DatabaseService();
      
      const config: DatabaseConnection = {
        id: 'test',
        name: 'test',
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        username: 'user@domain',
        password: 'p@ss:word',
        database: 'testdb',
        mongoOptions: { authSource: 'admin' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const uri = (service as any).buildMongoURI(config);
      
      expect(uri).toContain('user%40domain');
      expect(uri).toContain('p%40ss%3Aword');
    });
  });

  describe('MongoDB Connection Config', () => {
    it('should handle MongoDB connection configuration', () => {
      const mongoConfig: DatabaseConnection = {
        id: 'test',
        name: 'Test MongoDB',
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        username: 'admin',
        password: 'password',
        database: 'testdb',
        mongoOptions: {
          authSource: 'admin',
          ssl: true,
          directConnection: true,
          replicaSet: 'rs0',
          connectionTimeout: 30000,
          maxPoolSize: 10
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      expect(mongoConfig.type).toBe('mongodb');
      expect(mongoConfig.mongoOptions?.authSource).toBe('admin');
      expect(mongoConfig.mongoOptions?.ssl).toBe(true);
      expect(mongoConfig.mongoOptions?.directConnection).toBe(true);
      expect(mongoConfig.mongoOptions?.replicaSet).toBe('rs0');
    });

    it('should handle MongoDB connection without options', () => {
      const mongoConfig: DatabaseConnection = {
        id: 'test',
        name: 'Test MongoDB',
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        username: 'admin',
        password: 'password',
        database: 'testdb',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      expect(mongoConfig.type).toBe('mongodb');
      expect(mongoConfig.mongoOptions).toBeUndefined();
    });
  });
});
