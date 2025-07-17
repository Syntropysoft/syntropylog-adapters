import { describe, it, expect, beforeEach } from 'vitest';
import { TypeORMSerializer } from '../../src/serializers/typeorm/TypeORMSerializer';

describe('TypeORMSerializer Smoke Tests', () => {
  let serializer: TypeORMSerializer;

  beforeEach(() => {
    serializer = new TypeORMSerializer();
  });

  it('should instantiate without errors', () => {
    expect(serializer.name).toBe('typeorm');
    expect(serializer.priority).toBe(80);
  });

  it('should implement ISerializer interface correctly', () => {
    expect(typeof serializer.canSerialize).toBe('function');
    expect(typeof serializer.getComplexity).toBe('function');
    expect(typeof serializer.serialize).toBe('function');
  });

  it('should handle basic TypeORM query serialization', async () => {
    const query = {
      sql: 'SELECT * FROM users WHERE id = ?',
      parameters: [1],
      queryType: 'SELECT'
    };

    const result = await serializer.serialize(query, {});

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.metadata.serializer).toBe('typeorm');
    expect(result.metadata.duration).toBeLessThan(50); // Default timeout
  });

  it('should respect timeout from context', async () => {
    const query = { sql: 'SELECT 1', parameters: [], queryType: 'SELECT' };
    const context = { timeout: 100 };

    const result = await serializer.serialize(query, context);

    expect(result.success).toBe(true);
    expect(result.metadata.duration).toBeLessThan(100);
  });

  it('should handle unknown data gracefully', async () => {
    const unknownData = { random: 'data' };

    const result = await serializer.serialize(unknownData, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tipo de dato TypeORM no reconocido');
  });
}); 