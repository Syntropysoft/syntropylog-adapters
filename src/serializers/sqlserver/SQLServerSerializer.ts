import { ISerializer, SerializationContext, SerializationResult } from '../../types';

export interface SQLServerQuery {
  query: string;
  parameters?: Array<{
    name: string;
    value: any;
    type?: any;
  }>;
  options?: {
    timeout?: number;
    useUTC?: boolean;
    useNumericString?: boolean;
  };
  config?: {
    server?: string;
    database?: string;
    user?: string;
    password?: string;
    port?: number;
  };
}

export interface SQLServerError {
  code: string;
  number: number;
  state: number;
  class: number;
  lineNumber: number;
  serverName: string;
  procName: string;
  message: string;
  sql?: string;
}

export class SQLServerSerializer implements ISerializer {
  name = 'sqlserver';
  priority = 95;

  canSerialize(data: any): boolean {
    return (
      this.isSQLServerQuery(data) ||
      this.isSQLServerError(data) ||
      this.isSQLServerConnection(data) ||
      this.isSQLServerPool(data)
    );
  }

  getComplexity(data: any): 'low' | 'medium' | 'high' {
    if (this.isSQLServerQuery(data)) {
      return this.assessQueryComplexity(data);
    }
    if (this.isSQLServerError(data)) {
      return 'low';
    }
    if (this.isSQLServerConnection(data)) {
      return 'low';
    }
    if (this.isSQLServerPool(data)) {
      return 'medium';
    }
    return 'low';
  }

  // ✅ Timeout ultra-bajo: solo para desenmarañar objetos
  getTimeout(data: any): number | null {
    return 10; // 10ms máximo para desenmarañar cualquier objeto SQL Server
  }

  async serialize(data: any, context: SerializationContext): Promise<SerializationResult> {
    const startTime = Date.now();
    
    try {
      let result: any;

      if (this.isSQLServerQuery(data)) {
        result = this.serializeQuery(data);
      } else if (this.isSQLServerError(data)) {
        result = this.serializeError(data);
      } else if (this.isSQLServerConnection(data)) {
        result = this.serializeConnection(data);
      } else if (this.isSQLServerPool(data)) {
        result = this.serializePool(data);
      } else {
        throw new Error('Tipo de dato SQL Server no reconocido');
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
        error: error instanceof Error ? error.message : 'Error desconocido en serialización SQL Server',
        metadata: {
          serializer: this.name,
          complexity: this.getComplexity(data),
          duration,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private isSQLServerQuery(data: any): data is SQLServerQuery {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.query === 'string' &&
      (data.parameters === undefined || Array.isArray(data.parameters))
    );
  }

  private isSQLServerError(data: any): data is SQLServerError {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.code === 'string' &&
      typeof data.number === 'number' &&
      typeof data.message === 'string'
    );
  }

  private isSQLServerConnection(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.query === 'function' &&
      typeof data.connect === 'function' &&
      typeof data.close === 'function'
    );
  }

  private isSQLServerPool(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.connect === 'function' &&
      typeof data.query === 'function' &&
      typeof data.close === 'function'
    );
  }

  private assessQueryComplexity(query: SQLServerQuery): 'low' | 'medium' | 'high' {
    let complexity = 0;
    const sql = query.query.toLowerCase();
    
    // Basado en el tipo de operación
    if (sql.includes('select') && !sql.includes('join')) complexity += 1;
    else if (sql.includes('insert')) complexity += 2;
    else if (sql.includes('update')) complexity += 3;
    else if (sql.includes('delete')) complexity += 3;
    else if (sql.includes('create') || sql.includes('alter') || sql.includes('drop')) {
      complexity += 4; // DDL operations
    }
    
    // Basado en stored procedures
    if (sql.includes('exec') || sql.includes('execute')) {
      complexity += 3; // Stored procedures son más complejas
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
    
    // Basado en funciones específicas de SQL Server
    if (sql.includes('row_number()') || sql.includes('rank()') || sql.includes('dense_rank()')) {
      complexity += 2;
    }
    if (sql.includes('pivot') || sql.includes('unpivot')) complexity += 3;
    if (sql.includes('merge')) complexity += 3;
    if (sql.includes('apply')) complexity += 2;
    
    // Basado en la longitud del SQL
    if (sql.length > 1000) complexity += 3;
    else if (sql.length > 500) complexity += 2;
    else if (sql.length > 200) complexity += 1;
    
    // Basado en parámetros
    if (query.parameters && query.parameters.length > 20) complexity += 2;
    else if (query.parameters && query.parameters.length > 10) complexity += 1;
    
    if (complexity >= 8) return 'high';
    if (complexity >= 4) return 'medium';
    return 'low';
  }

  private serializeQuery(query: SQLServerQuery): any {
    return {
      type: 'SQLServerQuery',
      query: query.query, // SQL original, sin sanitizar
      parameters: query.parameters, // Parámetros originales, sin sanitizar
      options: query.options,
      config: query.config ? {
        server: query.config.server,
        database: query.config.database,
        user: query.config.user,
        password: query.config.password, // Contraseña original, sin sanitizar
        port: query.config.port
      } : undefined,
      complexity: this.assessQueryComplexity(query)
    };
  }

  private serializeError(error: SQLServerError): any {
    return {
      type: 'SQLServerError',
      code: error.code,
      number: error.number,
      state: error.state,
      class: error.class,
      lineNumber: error.lineNumber,
      serverName: error.serverName,
      procName: error.procName,
      message: error.message,
      sql: error.sql // SQL original, sin sanitizar
    };
  }

  private serializeConnection(connection: any): any {
    return {
      type: 'SQLServerConnection',
      config: connection.config ? {
        server: connection.config.server,
        database: connection.config.database,
        user: connection.config.user,
        password: connection.config.password, // Contraseña original, sin sanitizar
        port: connection.config.port,
        options: connection.config.options
      } : undefined,
      hasQuery: typeof connection.query === 'function',
      hasConnect: typeof connection.connect === 'function',
      hasClose: typeof connection.close === 'function'
    };
  }

  private serializePool(pool: any): any {
    return {
      type: 'SQLServerPool',
      config: pool.config ? {
        server: pool.config.server,
        database: pool.config.database,
        user: pool.config.user,
        password: pool.config.password, // Contraseña original, sin sanitizar
        port: pool.config.port,
        pool: {
          max: pool.config.pool?.max,
          min: pool.config.pool?.min,
          idleTimeoutMillis: pool.config.pool?.idleTimeoutMillis
        }
      } : undefined,
      hasConnect: typeof pool.connect === 'function',
      hasQuery: typeof pool.query === 'function',
      hasClose: typeof pool.close === 'function'
    };
  }
} 