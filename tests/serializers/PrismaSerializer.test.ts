import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaSerializer } from '../../src/serializers/prisma/PrismaSerializer';

describe('PrismaSerializer', () => {
  let serializer: PrismaSerializer;

  beforeEach(() => {
    serializer = new PrismaSerializer();
  });

  describe('canSerialize', () => {
    it('should return true for Prisma query objects', () => {
      const prismaQuery = {
        model: 'User',
        action: 'findMany',
        args: { where: { email: 'test@example.com' } }
      };

      expect(serializer.canSerialize(prismaQuery)).toBe(true);
    });

    it('should return true for Prisma error objects', () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['email'] }
      };

      expect(serializer.canSerialize(prismaError)).toBe(true);
    });

    it('should return true for Prisma client objects', () => {
      const prismaClient = {
        $connect: () => Promise.resolve(),
        $disconnect: () => Promise.resolve(),
        $queryRaw: () => Promise.resolve()
      };

      expect(serializer.canSerialize(prismaClient)).toBe(true);
    });

    it('should return false for non-Prisma objects', () => {
      const regularObject = { name: 'test', value: 123 };
      expect(serializer.canSerialize(regularObject)).toBe(false);
    });
  });

  describe('getComplexity', () => {
    it('should return low complexity for simple queries', () => {
      const simpleQuery = {
        model: 'User',
        action: 'findFirst',
        args: { where: { id: 1 } }
      };

      expect(serializer.getComplexity(simpleQuery)).toBe('low');
    });

    it('should return medium complexity for moderate queries', () => {
      const moderateQuery = {
        model: 'User',
        action: 'findMany',
        args: {
          where: { email: 'test@example.com' },
          include: { posts: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      };

      expect(serializer.getComplexity(moderateQuery)).toBe('medium');
    });

    it('should return high complexity for complex queries', () => {
      const complexQuery = {
        model: 'User',
        action: 'aggregate',
        args: {
          where: { email: 'test@example.com' },
          include: { posts: { include: { comments: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          skip: 5,
          distinct: ['email']
        }
      };

      expect(serializer.getComplexity(complexQuery)).toBe('high');
    });
  });



  describe('serialize', () => {
    it('should serialize Prisma query correctly', async () => {
      const query = {
        model: 'User',
        action: 'findMany',
        args: { where: { email: 'test@example.com' } },
        duration: 45
      };

      const result = await serializer.serialize(query, {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'PrismaQuery',
        model: 'User',
        action: 'findMany',
        args: { where: { email: 'test@example.com' } },
        duration: 45,
        complexity: 'low'
      });
    });

    it('should serialize Prisma error correctly', async () => {
      const error = {
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['email'] }
      };

      const result = await serializer.serialize(error, {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'PrismaError',
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['email'] }
      });
    });

    it('should serialize Prisma client correctly', async () => {
      const client = {
        $connect: () => Promise.resolve(),
        $disconnect: () => Promise.resolve(),
        $queryRaw: () => Promise.resolve(),
        $executeRaw: () => Promise.resolve(),
        $transaction: () => Promise.resolve(),
        $use: () => Promise.resolve(),
        $on: () => Promise.resolve()
      };

      const result = await serializer.serialize(client, {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'PrismaClient',
        hasConnect: true,
        hasDisconnect: true,
        hasQueryRaw: true,
        hasExecuteRaw: true,
        hasTransaction: true,
        hasUse: true,
        hasOn: true
      });
    });

    it('should handle unknown data types', async () => {
      const unknownData = { random: 'data' };

      const result = await serializer.serialize(unknownData, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tipo de dato Prisma no reconocido');
    });

    it('should include metadata in result', async () => {
      const query = { model: 'User', action: 'findFirst' };

      const result = await serializer.serialize(query, {});

      expect(result.metadata).toEqual({
        serializer: 'prisma',
        complexity: 'low',
        duration: expect.any(Number),
        timestamp: expect.any(String)
      });
    });

    it('should respect timeout from context', async () => {
      const query = { model: 'User', action: 'findFirst' };
      const context = { timeout: 100 };

      const result = await serializer.serialize(query, context);

      expect(result.success).toBe(true);
      expect(result.metadata.duration).toBeLessThan(100);
    });

    it('should use default timeout when not provided in context', async () => {
      const query = { model: 'User', action: 'findFirst' };

      const result = await serializer.serialize(query, {});

      expect(result.success).toBe(true);
      expect(result.metadata.duration).toBeLessThan(50); // Default timeout
    });
  });
}); 