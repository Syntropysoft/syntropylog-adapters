import { describe, it, expect, beforeEach } from 'vitest';
import { SQLServerSerializer } from '../../src/serializers/sqlserver/SQLServerSerializer';

describe('SQLServerSerializer Smoke Tests', () => {
  let serializer: SQLServerSerializer;

  beforeEach(() => {
    serializer = new SQLServerSerializer();
  });

  it('should instantiate without errors', () => {
    expect(serializer.name).toBe('sqlserver');
    expect(serializer.priority).toBe(95);
  });

  it('should implement ISerializer interface correctly', () => {
    expect(typeof serializer.canSerialize).toBe('function');
    expect(typeof serializer.getComplexity).toBe('function');
    expect(typeof serializer.serialize).toBe('function');
  });

  it('should handle basic SQL Server query serialization', async () => {
    const query = {
      query: 'SELECT * FROM users WHERE id = @id',
      parameters: [{ name: 'id', value: 1 }]
    };

    const result = await serializer.serialize(query, {});

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.metadata.serializer).toBe('sqlserver');
    expect(result.metadata.duration).toBeLessThan(50); // Default timeout
  });

  it('should respect timeout from context', async () => {
    const query = { query: 'SELECT 1', parameters: [] };
    const context = { timeout: 100 };

    const result = await serializer.serialize(query, context);

    expect(result.success).toBe(true);
    expect(result.metadata.duration).toBeLessThan(100);
  });

  it('should handle unknown data gracefully', async () => {
    const unknownData = { random: 'data' };

    const result = await serializer.serialize(unknownData, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tipo de dato SQL Server no reconocido');
  });
}); 