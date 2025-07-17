import { ISerializer, SerializationContext, SerializationResult } from '../../types';

export interface OracleQuery {
  sql: string;
  bindParams?: Array<{
    name: string;
    value: any;
    type?: any;
    direction?: 'in' | 'out' | 'inout';
  }>;
  options?: {
    outFormat?: number;
    autoCommit?: boolean;
    fetchArraySize?: number;
    maxRows?: number;
  };
  config?: {
    host?: string;
    port?: number;
    serviceName?: string;
    user?: string;
    password?: string;
    connectString?: string;
  };
}

export interface OracleError {
  code: number;
  message: string;
  offset?: number;
  sql?: string;
  cause?: any;
}

export class OracleSerializer implements ISerializer {
  name = 'oracle';
  priority = 100;

  canSerialize(data: any): boolean {
    return (
      this.isOracleQuery(data) ||
      this.isOracleError(data) ||
      this.isOracleConnection(data) ||
      this.isOraclePool(data)
    );
  }

  getComplexity(data: any): 'low' | 'medium' | 'high' {
    if (this.isOracleQuery(data)) {
      return this.assessQueryComplexity(data);
    }
    if (this.isOracleError(data)) {
      return 'low';
    }
    if (this.isOracleConnection(data)) {
      return 'low';
    }
    if (this.isOraclePool(data)) {
      return 'medium';
    }
    return 'low';
  }

  // ✅ Timeout ultra-bajo: solo para desenmarañar objetos
  getTimeout(data: any): number | null {
    return 10; // 10ms máximo para desenmarañar cualquier objeto Oracle
  }

  async serialize(data: any, context: SerializationContext): Promise<SerializationResult> {
    const startTime = Date.now();
    
    try {
      let result: any;

      if (this.isOracleQuery(data)) {
        result = this.serializeQuery(data);
      } else if (this.isOracleError(data)) {
        result = this.serializeError(data);
      } else if (this.isOracleConnection(data)) {
        result = this.serializeConnection(data);
      } else if (this.isOraclePool(data)) {
        result = this.serializePool(data);
      } else {
        throw new Error('Tipo de dato Oracle no reconocido');
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
        error: error instanceof Error ? error.message : 'Error desconocido en serialización Oracle',
        metadata: {
          serializer: this.name,
          complexity: this.getComplexity(data),
          duration,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private isOracleQuery(data: any): data is OracleQuery {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.sql === 'string' &&
      (data.bindParams === undefined || Array.isArray(data.bindParams))
    );
  }

  private isOracleError(data: any): data is OracleError {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.code === 'number' &&
      typeof data.message === 'string'
    );
  }

  private isOracleConnection(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.execute === 'function' &&
      typeof data.commit === 'function' &&
      typeof data.rollback === 'function'
    );
  }

  private isOraclePool(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.getConnection === 'function' &&
      typeof data.execute === 'function' &&
      typeof data.close === 'function'
    );
  }

  private assessQueryComplexity(query: OracleQuery): 'low' | 'medium' | 'high' {
    let complexity = 0;
    const sql = query.sql.toLowerCase();
    
    // Basado en el tipo de operación
    if (sql.includes('select') && !sql.includes('join')) complexity += 1;
    else if (sql.includes('insert')) complexity += 2;
    else if (sql.includes('update')) complexity += 3;
    else if (sql.includes('delete')) complexity += 3;
    else if (sql.includes('create') || sql.includes('alter') || sql.includes('drop')) {
      complexity += 4; // DDL operations
    }
    
    // Basado en PL/SQL
    if (sql.includes('begin') || sql.includes('declare')) {
      complexity += 4; // PL/SQL blocks son complejos
    }
    
    // Basado en stored procedures
    if (sql.includes('call') || sql.includes('execute')) {
      complexity += 3;
    }
    
    // Basado en CTEs (Common Table Expressions)
    if (sql.includes('with')) {
      const cteCount = (sql.match(/with\s+\w+\s+as/gi) || []).length;
      complexity += cteCount * 3;
    }
    
    // Basado en window functions
    if (sql.includes('over(')) {
      const windowCount = (sql.match(/over\s*\(/gi) || []).length;
      complexity += windowCount * 2;
    }
    
    // Basado en joins
    if (sql.includes('join')) {
      const joinCount = (sql.match(/join/g) || []).length;
      complexity += joinCount * 2;
    }
    
    // Basado en subqueries
    if (sql.includes('(select') || sql.includes('( select')) {
      const subqueryCount = (sql.match(/\(select/g) || []).length;
      complexity += subqueryCount * 3;
    }
    
    // Basado en funciones específicas de Oracle
    if (sql.includes('connect by') || sql.includes('start with')) {
      complexity += 3; // Hierarchical queries
    }
    if (sql.includes('pivot') || sql.includes('unpivot')) complexity += 3;
    if (sql.includes('merge')) complexity += 3;
    if (sql.includes('model')) complexity += 4; // MODEL clause
    if (sql.includes('flashback')) complexity += 2;
    
    // Basado en la longitud del SQL
    if (sql.length > 1000) complexity += 3;
    else if (sql.length > 500) complexity += 2;
    else if (sql.length > 200) complexity += 1;
    
    // Basado en parámetros
    if (query.bindParams && query.bindParams.length > 20) complexity += 2;
    else if (query.bindParams && query.bindParams.length > 10) complexity += 1;
    
    if (complexity >= 8) return 'high';
    if (complexity >= 4) return 'medium';
    return 'low';
  }

  private serializeQuery(query: OracleQuery): any {
    return {
      type: 'OracleQuery',
      sql: query.sql, // SQL original, sin sanitizar
      bindParams: query.bindParams, // Parámetros originales, sin sanitizar
      options: query.options,
      config: query.config ? {
        host: query.config.host,
        port: query.config.port,
        serviceName: query.config.serviceName,
        user: query.config.user,
        password: query.config.password, // Contraseña original, sin sanitizar
        connectString: query.config.connectString // String de conexión original, sin sanitizar
      } : undefined,
      complexity: this.assessQueryComplexity(query)
    };
  }

  private serializeError(error: OracleError): any {
    return {
      type: 'OracleError',
      code: error.code,
      message: error.message,
      offset: error.offset,
      sql: error.sql, // SQL original, sin sanitizar
      cause: error.cause
    };
  }

  private serializeConnection(connection: any): any {
    return {
      type: 'OracleConnection',
      oracleServerVersion: connection.oracleServerVersion,
      oracleServerVersionString: connection.oracleServerVersionString,
      config: connection.config ? {
        host: connection.config.host,
        port: connection.config.port,
        serviceName: connection.config.serviceName,
        user: connection.config.user,
        password: connection.config.password, // Contraseña original, sin sanitizar
        connectString: connection.config.connectString // String de conexión original, sin sanitizar
      } : undefined,
      hasExecute: typeof connection.execute === 'function',
      hasCommit: typeof connection.commit === 'function',
      hasRollback: typeof connection.rollback === 'function'
    };
  }

  private serializePool(pool: any): any {
    return {
      type: 'OraclePool',
      poolMax: pool.poolMax,
      poolMin: pool.poolMin,
      poolIncrement: pool.poolIncrement,
      poolTimeout: pool.poolTimeout,
      config: pool.config ? {
        host: pool.config.host,
        port: pool.config.port,
        serviceName: pool.config.serviceName,
        user: pool.config.user,
        password: pool.config.password, // Contraseña original, sin sanitizar
        connectString: pool.config.connectString // String de conexión original, sin sanitizar
      } : undefined,
      hasGetConnection: typeof pool.getConnection === 'function',
      hasExecute: typeof pool.execute === 'function',
      hasClose: typeof pool.close === 'function'
    };
  }
} 