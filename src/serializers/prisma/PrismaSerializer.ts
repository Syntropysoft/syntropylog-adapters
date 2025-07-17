import { ISerializer, SerializationContext, SerializationResult } from '../../types';

export interface PrismaQuery {
  model: string;
  action: string;
  args?: any;
  duration?: number;
  timestamp?: string;
}

export interface PrismaError {
  code: string;
  message: string;
  meta?: any;
  clientVersion?: string;
  stack?: string;
}

export class PrismaSerializer implements ISerializer {
  name = 'prisma';
  priority = 75;

  canSerialize(data: any): boolean {
    return (
      this.isPrismaQuery(data) ||
      this.isPrismaError(data) ||
      this.isPrismaClient(data)
    );
  }

  getComplexity(data: any): 'low' | 'medium' | 'high' {
    if (this.isPrismaQuery(data)) {
      return this.assessQueryComplexity(data);
    }
    if (this.isPrismaError(data)) {
      return 'low';
    }
    if (this.isPrismaClient(data)) {
      return 'low';
    }
    return 'low';
  }

  // ✅ Timeout ultra-bajo: solo para desenmarañar objetos
  getTimeout(data: any): number | null {
    return 10; // 10ms máximo para desenmarañar cualquier objeto Prisma
  }

  async serialize(data: any, context: SerializationContext): Promise<SerializationResult> {
    const startTime = Date.now();
    
    try {
      let result: any;

      if (this.isPrismaQuery(data)) {
        result = this.serializeQuery(data);
      } else if (this.isPrismaError(data)) {
        result = this.serializeError(data);
      } else if (this.isPrismaClient(data)) {
        result = this.serializeClient(data);
      } else {
        throw new Error('Tipo de dato Prisma no reconocido');
      }

      const duration = Date.now() - startTime;
      
      // ✅ Verificar que la serialización fue ultra-rápida
      if (duration > 10) {
        throw new Error(`Serialización lenta: ${duration}ms (máximo 10ms para desenmarañar)`);
      }
      
      return {
        success: true,
        data: result,
        metadata: {
          serializer: this.name,
          complexity: this.getComplexity(data),
          duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en serialización Prisma',
        metadata: {
          serializer: this.name,
          complexity: this.getComplexity(data),
          duration,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private isPrismaQuery(data: any): data is PrismaQuery {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.model === 'string' &&
      typeof data.action === 'string'
    );
  }

  private isPrismaError(data: any): data is PrismaError {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.code === 'string' &&
      typeof data.message === 'string'
    );
  }

  private isPrismaClient(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.$connect === 'function' &&
      typeof data.$disconnect === 'function' &&
      typeof data.$queryRaw === 'function'
    );
  }

  private assessQueryComplexity(query: PrismaQuery): 'low' | 'medium' | 'high' {
    let complexity = 0;
    
    // Basado en la acción
    if (query.action === 'findMany') complexity += 1;
    else if (query.action === 'findFirst') complexity += 1;
    else if (query.action === 'findUnique') complexity += 1;
    else if (query.action === 'create') complexity += 2;
    else if (query.action === 'update') complexity += 2;
    else if (query.action === 'updateMany') complexity += 3;
    else if (query.action === 'delete') complexity += 2;
    else if (query.action === 'deleteMany') complexity += 3;
    else if (query.action === 'upsert') complexity += 3;
    else if (query.action === 'aggregate') complexity += 4;
    else if (query.action === 'groupBy') complexity += 4;
    else if (query.action === 'count') complexity += 1;
    
    // Basado en argumentos complejos
    if (query.args) {
      if (query.args.include) complexity += 2;
      if (query.args.select) complexity += 1;
      if (query.args.where && typeof query.args.where === 'object') {
        const whereKeys = Object.keys(query.args.where);
        complexity += Math.min(whereKeys.length, 3);
      }
      if (query.args.orderBy) complexity += 1;
      if (query.args.take) complexity += 1;
      if (query.args.skip) complexity += 1;
      if (query.args.distinct) complexity += 1;
    }
    
    if (complexity >= 6) return 'high';
    if (complexity >= 3) return 'medium';
    return 'low';
  }

  private serializeQuery(query: PrismaQuery): any {
    return {
      type: 'PrismaQuery',
      model: query.model,
      action: query.action,
      args: query.args, // Datos originales, sin sanitizar
      duration: query.duration,
      timestamp: query.timestamp,
      complexity: this.assessQueryComplexity(query)
    };
  }

  private serializeError(error: PrismaError): any {
    return {
      type: 'PrismaError',
      code: error.code,
      message: error.message,
      meta: error.meta, // Datos originales, sin sanitizar
      clientVersion: error.clientVersion,
      stack: error.stack
    };
  }

  private serializeClient(client: any): any {
    return {
      type: 'PrismaClient',
      hasConnect: typeof client.$connect === 'function',
      hasDisconnect: typeof client.$disconnect === 'function',
      hasQueryRaw: typeof client.$queryRaw === 'function',
      hasExecuteRaw: typeof client.$executeRaw === 'function',
      hasTransaction: typeof client.$transaction === 'function',
      hasUse: typeof client.$use === 'function',
      hasOn: typeof client.$on === 'function'
    };
  }
} 