import { describe, it, expect, beforeEach } from 'vitest';
import { OracleSerializer } from '../../src/serializers/oracle/OracleSerializer';

describe('OracleSerializer Smoke Tests', () => {
  let serializer: OracleSerializer;

  beforeEach(() => {
    serializer = new OracleSerializer();
  });

  it('should instantiate without errors', () => {
    expect(serializer.name).toBe('oracle');
    expect(serializer.priority).toBe(100);
  });

  it('should implement ISerializer interface correctly', () => {
    expect(typeof serializer.canSerialize).toBe('function');
    expect(typeof serializer.getComplexity).toBe('function');
    expect(typeof serializer.serialize).toBe('function');
  });

  it('should handle basic Oracle query serialization', async () => {
    const query = {
      sql: 'SELECT * FROM users WHERE id = :id',
      bindParams: [{ name: 'id', value: 1 }]
    };

    const result = await serializer.serialize(query, {});

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.metadata.serializer).toBe('oracle');
    expect(result.metadata.duration).toBeLessThan(50); // Default timeout
  });

  it('should respect timeout from context', async () => {
    const query = { sql: 'SELECT 1 FROM dual', bindParams: [] };
    const context = { timeout: 100 };

    const result = await serializer.serialize(query, context);

    expect(result.success).toBe(true);
    expect(result.metadata.duration).toBeLessThan(100);
  });

  it('should handle unknown data gracefully', async () => {
    const unknownData = { random: 'data' };

    const result = await serializer.serialize(unknownData, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tipo de dato Oracle no reconocido');
  });
}); 