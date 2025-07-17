import { describe, it, expect, beforeEach } from 'vitest';
import { MySQLSerializer } from '../../src/serializers/mysql/MySQLSerializer';

describe('MySQLSerializer Smoke Tests', () => {
  let serializer: MySQLSerializer;

  beforeEach(() => {
    serializer = new MySQLSerializer();
  });

  it('should instantiate without errors', () => {
    expect(serializer.name).toBe('mysql');
    expect(serializer.priority).toBe(85);
  });

  it('should implement ISerializer interface correctly', () => {
    expect(typeof serializer.canSerialize).toBe('function');
    expect(typeof serializer.getComplexity).toBe('function');
    expect(typeof serializer.serialize).toBe('function');
  });

  it('should handle basic MySQL query serialization', async () => {
    const query = {
      sql: 'SELECT * FROM users WHERE id = ?',
      values: [1],
      database: 'testdb'
    };

    const result = await serializer.serialize(query, {});

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.metadata.serializer).toBe('mysql');
    expect(result.metadata.duration).toBeLessThan(50); // Default timeout
  });

  it('should respect timeout from context', async () => {
    const query = { sql: 'SELECT 1', values: [] };
    const context = { timeout: 100 };

    const result = await serializer.serialize(query, context);

    expect(result.success).toBe(true);
    expect(result.metadata.duration).toBeLessThan(100);
  });

  it('should handle unknown data gracefully', async () => {
    const unknownData = { random: 'data' };

    const result = await serializer.serialize(unknownData, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tipo de dato MySQL no reconocido');
  });
}); 