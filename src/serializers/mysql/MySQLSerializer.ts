import { ISerializer, SerializationContext, SerializationResult } from '../../types';

export interface MySQLQuery {
  sql: string;
  values?: any[];
  timeout?: number;
  connectionConfig?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
  };
}

export interface MySQLError {
  code: string;
  errno: number;
  sqlMessage: string;
  sqlState: string;
  index: number;
  sql: string;
  fatal: boolean;
}

export class MySQLSerializer implements ISerializer {
  name = 'mysql';
  priority = 85;

  canSerialize(data: any): boolean {
    return (
      this.isMySQLQuery(data) ||
      this.isMySQLError(data) ||
      this.isMySQLConnection(data) ||
      this.isMySQLPool(data)
    );
  }

  getComplexity(data: any): 'low' | 'medium' | 'high' {
    if (this.isMySQLQuery(data)) {
      return this.assessQueryComplexity(data);
    }
    if (this.isMySQLError(data)) {
      return 'low';
    }
    if (this.isMySQLConnection(data)) {
      return 'low';
    }
    if (this.isMySQLPool(data)) {
      return 'medium';
    }
    return 'low';
  }



  async serialize(data: any, context: SerializationContext): Promise<SerializationResult> {
    const startTime = Date.now();
    
    try {
      let result: any;

      if (this.isMySQLQuery(data)) {
        result = this.serializeQuery(data);
      } else if (this.isMySQLError(data)) {
        result = this.serializeError(data);
      } else if (this.isMySQLConnection(data)) {
        result = this.serializeConnection(data);
      } else if (this.isMySQLPool(data)) {
        result = this.serializePool(data);
      } else {
        throw new Error('Tipo de dato MySQL no reconocido');
      }

      const duration = Date.now() - startTime;
      
      // ✅ Verificar que la serialización respeta el timeout del contexto
      const timeout = context.timeout || 50;
      if (duration > timeout) {
        throw new Error(`Serialización lenta: ${duration}ms (máximo ${timeout}ms)`);
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
        error: error instanceof Error ? error.message : 'Error desconocido en serialización MySQL',
        metadata: {
          serializer: this.name,
          complexity: this.getComplexity(data),
          duration,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private isMySQLQuery(data: any): data is MySQLQuery {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.sql === 'string' &&
      (data.values === undefined || Array.isArray(data.values))
    );
  }

  private isMySQLError(data: any): data is MySQLError {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.code === 'string' &&
      typeof data.errno === 'number' &&
      typeof data.sqlMessage === 'string'
    );
  }

  private isMySQLConnection(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.query === 'function' &&
      typeof data.connect === 'function' &&
      typeof data.end === 'function'
    );
  }

  private isMySQLPool(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.getConnection === 'function' &&
      typeof data.query === 'function' &&
      typeof data.end === 'function'
    );
  }

  private assessQueryComplexity(query: MySQLQuery): 'low' | 'medium' | 'high' {
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
    
    // Basado en funciones complejas
    if (sql.includes('group_concat') || sql.includes('json_')) complexity += 2;
    if (sql.includes('window') || sql.includes('over(')) complexity += 3;
    
    // Basado en la longitud del SQL
    if (sql.length > 1000) complexity += 3;
    else if (sql.length > 500) complexity += 2;
    else if (sql.length > 200) complexity += 1;
    
    // Basado en parámetros
    if (query.values && query.values.length > 20) complexity += 2;
    else if (query.values && query.values.length > 10) complexity += 1;
    
    if (complexity >= 8) return 'high';
    if (complexity >= 4) return 'medium';
    return 'low';
  }

  private serializeQuery(query: MySQLQuery): any {
    return {
      type: 'MySQLQuery',
      sql: query.sql, // SQL original, sin sanitizar
      values: query.values, // Valores originales, sin sanitizar
      timeout: query.timeout,
      connectionConfig: query.connectionConfig ? {
        host: query.connectionConfig.host,
        port: query.connectionConfig.port,
        database: query.connectionConfig.database,
        user: query.connectionConfig.user,
        password: query.connectionConfig.password // Contraseña original, sin sanitizar
      } : undefined,
      complexity: this.assessQueryComplexity(query)
    };
  }

  private serializeError(error: MySQLError): any {
    return {
      type: 'MySQLError',
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      index: error.index,
      sql: error.sql, // SQL original, sin sanitizar
      fatal: error.fatal
    };
  }

  private serializeConnection(connection: any): any {
    return {
      type: 'MySQLConnection',
      threadId: connection.threadId,
      state: connection.state,
      config: connection.config ? {
        host: connection.config.host,
        port: connection.config.port,
        database: connection.config.database,
        user: connection.config.user,
        password: connection.config.password // Contraseña original, sin sanitizar
      } : undefined,
      hasQuery: typeof connection.query === 'function',
      hasConnect: typeof connection.connect === 'function',
      hasEnd: typeof connection.end === 'function'
    };
  }

  private serializePool(pool: any): any {
    return {
      type: 'MySQLPool',
      config: pool.config ? {
        host: pool.config.host,
        port: pool.config.port,
        database: pool.config.database,
        user: pool.config.user,
        password: pool.config.password, // Contraseña original, sin sanitizar
        connectionLimit: pool.config.connectionLimit,
        acquireTimeout: pool.config.acquireTimeout,
        timeout: pool.config.timeout
      } : undefined,
      hasGetConnection: typeof pool.getConnection === 'function',
      hasQuery: typeof pool.query === 'function',
      hasEnd: typeof pool.end === 'function'
    };
  }
} 