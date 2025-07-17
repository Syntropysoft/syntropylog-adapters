import { ISerializer, SerializationContext, SerializationResult } from '../../types';

export interface PostgreSQLQuery {
  text: string;
  values?: any[];
  name?: string;
  rowMode?: string;
  types?: any[];
  config?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
  };
}

export interface PostgreSQLError {
  code: string;
  message: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
  file?: string;
  line?: string;
  routine?: string;
}

export class PostgreSQLSerializer implements ISerializer {
  name = 'postgresql';
  priority = 90;

  canSerialize(data: any): boolean {
    return (
      this.isPostgreSQLQuery(data) ||
      this.isPostgreSQLError(data) ||
      this.isPostgreSQLClient(data) ||
      this.isPostgreSQLPool(data)
    );
  }

  getComplexity(data: any): 'low' | 'medium' | 'high' {
    if (this.isPostgreSQLQuery(data)) {
      return this.assessQueryComplexity(data);
    }
    if (this.isPostgreSQLError(data)) {
      return 'low';
    }
    if (this.isPostgreSQLClient(data)) {
      return 'low';
    }
    if (this.isPostgreSQLPool(data)) {
      return 'medium';
    }
    return 'low';
  }



  async serialize(data: any, context: SerializationContext): Promise<SerializationResult> {
    const startTime = Date.now();
    
    try {
      let result: any;

      if (this.isPostgreSQLQuery(data)) {
        result = this.serializeQuery(data);
      } else if (this.isPostgreSQLError(data)) {
        result = this.serializeError(data);
      } else if (this.isPostgreSQLClient(data)) {
        result = this.serializeClient(data);
      } else if (this.isPostgreSQLPool(data)) {
        result = this.serializePool(data);
      } else {
        throw new Error('Tipo de dato PostgreSQL no reconocido');
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
        error: error instanceof Error ? error.message : 'Error desconocido en serialización PostgreSQL',
        metadata: {
          serializer: this.name,
          complexity: this.getComplexity(data),
          duration,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private isPostgreSQLQuery(data: any): data is PostgreSQLQuery {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.text === 'string' &&
      (data.values === undefined || Array.isArray(data.values))
    );
  }

  private isPostgreSQLError(data: any): data is PostgreSQLError {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.code === 'string' &&
      typeof data.message === 'string'
    );
  }

  private isPostgreSQLClient(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.query === 'function' &&
      typeof data.connect === 'function' &&
      typeof data.end === 'function'
    );
  }

  private isPostgreSQLPool(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.connect === 'function' &&
      typeof data.query === 'function' &&
      typeof data.end === 'function'
    );
  }

  private assessQueryComplexity(query: PostgreSQLQuery): 'low' | 'medium' | 'high' {
    let complexity = 0;
    const sql = query.text.toLowerCase();
    
    // Basado en el tipo de operación
    if (sql.includes('select') && !sql.includes('join')) complexity += 1;
    else if (sql.includes('insert')) complexity += 2;
    else if (sql.includes('update')) complexity += 3;
    else if (sql.includes('delete')) complexity += 3;
    else if (sql.includes('create') || sql.includes('alter') || sql.includes('drop')) {
      complexity += 4; // DDL operations
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
    
    // Basado en funciones complejas de PostgreSQL
    if (sql.includes('json_') || sql.includes('array_')) complexity += 2;
    if (sql.includes('regexp_') || sql.includes('similar to')) complexity += 2;
    if (sql.includes('full text') || sql.includes('ts_')) complexity += 3;
    
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

  private serializeQuery(query: PostgreSQLQuery): any {
    return {
      type: 'PostgreSQLQuery',
      text: query.text, // SQL original, sin sanitizar
      values: query.values, // Valores originales, sin sanitizar
      name: query.name,
      rowMode: query.rowMode,
      types: query.types,
      config: query.config ? {
        host: query.config.host,
        port: query.config.port,
        database: query.config.database,
        user: query.config.user,
        password: query.config.password // Contraseña original, sin sanitizar
      } : undefined,
      complexity: this.assessQueryComplexity(query)
    };
  }

  private serializeError(error: PostgreSQLError): any {
    return {
      type: 'PostgreSQLError',
      code: error.code,
      message: error.message,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      internalPosition: error.internalPosition,
      internalQuery: error.internalQuery, // SQL original, sin sanitizar
      where: error.where, // SQL original, sin sanitizar
      schema: error.schema,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      constraint: error.constraint,
      file: error.file,
      line: error.line,
      routine: error.routine
    };
  }

  private serializeClient(client: any): any {
    return {
      type: 'PostgreSQLClient',
      processID: client.processID,
      secretKey: client.secretKey,
      config: client.connectionParameters ? {
        host: client.connectionParameters.host,
        port: client.connectionParameters.port,
        database: client.connectionParameters.database,
        user: client.connectionParameters.user,
        password: client.connectionParameters.password // Contraseña original, sin sanitizar
      } : undefined,
      hasQuery: typeof client.query === 'function',
      hasConnect: typeof client.connect === 'function',
      hasEnd: typeof client.end === 'function'
    };
  }

  private serializePool(pool: any): any {
    return {
      type: 'PostgreSQLPool',
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
      config: pool.options ? {
        host: pool.options.host,
        port: pool.options.port,
        database: pool.options.database,
        user: pool.options.user,
        password: pool.options.password, // Contraseña original, sin sanitizar
        max: pool.options.max,
        idleTimeoutMillis: pool.options.idleTimeoutMillis,
        connectionTimeoutMillis: pool.options.connectionTimeoutMillis
      } : undefined,
      hasConnect: typeof pool.connect === 'function',
      hasQuery: typeof pool.query === 'function',
      hasEnd: typeof pool.end === 'function'
    };
  }
} 