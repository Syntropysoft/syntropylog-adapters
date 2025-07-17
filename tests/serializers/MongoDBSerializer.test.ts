import { describe, it, expect, beforeEach } from 'vitest';
import { MongoDBSerializer } from '../../src/serializers/mongodb/MongoDBSerializer';

describe('MongoDBSerializer Smoke Tests', () => {
  let serializer: MongoDBSerializer;

  beforeEach(() => {
    serializer = new MongoDBSerializer();
  });

  it('should instantiate without errors', () => {
    expect(serializer.name).toBe('mongodb');
    expect(serializer.priority).toBe(70);
  });

  it('should implement ISerializer interface correctly', () => {
    expect(typeof serializer.canSerialize).toBe('function');
    expect(typeof serializer.getComplexity).toBe('function');
    expect(typeof serializer.serialize).toBe('function');
  });

  it('should handle basic MongoDB query serialization', async () => {
    const query = {
      collection: 'users',
      operation: 'find',
      filter: { email: 'test@example.com' }
    };

    const result = await serializer.serialize(query, {});

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.metadata.serializer).toBe('mongodb');
    expect(result.metadata.duration).toBeLessThan(50); // Default timeout
  });

  it('should respect timeout from context', async () => {
    const query = { collection: 'users', operation: 'find' };
    const context = { timeout: 100 };

    const result = await serializer.serialize(query, context);

    expect(result.success).toBe(true);
    expect(result.metadata.duration).toBeLessThan(100);
  });

  it('should handle unknown data gracefully', async () => {
    const unknownData = { random: 'data' };

    const result = await serializer.serialize(unknownData, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tipo de dato MongoDB no reconocido');
  });
}); 