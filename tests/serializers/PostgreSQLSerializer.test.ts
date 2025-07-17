import { describe, it, expect, beforeEach } from 'vitest';
import { PostgreSQLSerializer } from '../../src/serializers/postgres/PostgreSQLSerializer';

describe('PostgreSQLSerializer Smoke Tests', () => {
  let serializer: PostgreSQLSerializer;

  beforeEach(() => {
    serializer = new PostgreSQLSerializer();
  });

  it('should instantiate without errors', () => {
    expect(serializer.name).toBe('postgresql');
    expect(serializer.priority).toBe(90);
  });

  it('should implement ISerializer interface correctly', () => {
    expect(typeof serializer.canSerialize).toBe('function');
    expect(typeof serializer.getComplexity).toBe('function');
    expect(typeof serializer.serialize).toBe('function');
  });

  it('should handle basic PostgreSQL query serialization', async () => {
    const query = {
      text: 'SELECT * FROM users WHERE id = $1',
      values: [1],
      database: 'testdb'
    };

    const result = await serializer.serialize(query, {});

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.metadata.serializer).toBe('postgresql');
    expect(result.metadata.duration).toBeLessThan(50); // Default timeout
  });

  it('should respect timeout from context', async () => {
    const query = { text: 'SELECT 1', values: [] };
    const context = { timeout: 100 };

    const result = await serializer.serialize(query, context);

    expect(result.success).toBe(true);
    expect(result.metadata.duration).toBeLessThan(100);
  });

  it('should handle unknown data gracefully', async () => {
    const unknownData = { random: 'data' };

    const result = await serializer.serialize(unknownData, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tipo de dato PostgreSQL no reconocido');
  });
}); 