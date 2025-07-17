import { ISerializer, SerializationContext, SerializationResult } from '../../types';

export interface TypeORMQuery {
  sql: string;
  parameters?: any[];
  queryType?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RAW';
  table?: string;
  alias?: string;
  joins?: Array<{ table: string; alias: string; condition: string }>;
  where?: any;
  orderBy?: any;
  limit?: number;
  offset?: number;
}

export interface TypeORMError {
  code?: string;
  message: string;
  query?: string;
  parameters?: any[];
  table?: string;
  constraint?: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  column?: string;
  dataType?: string;
}

export class TypeORMSerializer implements ISerializer {
  name = 'typeorm';
  priority = 80;

  canSerialize(data: any): boolean {
    return (
      this.isTypeORMQuery(data) ||
      this.isTypeORMError(data) ||
      this.isTypeORMEntity(data) ||
      this.isTypeORMRepository(data) ||
      this.isTypeORMConnection(data)
    );
  }

  getComplexity(data: any): 'low' | 'medium' | 'high' {
    if (this.isTypeORMQuery(data)) {
      return this.assessQueryComplexity(data);
    }
    if (this.isTypeORMError(data)) {
      return 'low';
    }
    if (this.isTypeORMEntity(data)) {
      return this.assessEntityComplexity(data);
    }
    if (this.isTypeORMRepository(data)) {
      return 'medium';
    }
    if (this.isTypeORMConnection(data)) {
      return 'low';
    }
    return 'low';
  }

  // ✅ Timeout ultra-bajo: solo para desenmarañar objetos
  getTimeout(data: any): number | null {
    return 10; // 10ms máximo para desenmarañar cualquier objeto TypeORM
  }

  async serialize(data: any, context: SerializationContext): Promise<SerializationResult> {
    const startTime = Date.now();
    
    try {
      let result: any;

      if (this.isTypeORMQuery(data)) {
        result = this.serializeQuery(data);
      } else if (this.isTypeORMError(data)) {
        result = this.serializeError(data);
      } else if (this.isTypeORMEntity(data)) {
        result = this.serializeEntity(data);
      } else if (this.isTypeORMRepository(data)) {
        result = this.serializeRepository(data);
      } else if (this.isTypeORMConnection(data)) {
        result = this.serializeConnection(data);
      } else {
        throw new Error('Tipo de dato TypeORM no reconocido');
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
        error: error instanceof Error ? error.message : 'Error desconocido en serialización TypeORM',
        metadata: {
          serializer: this.name,
          complexity: this.getComplexity(data),
          duration,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private isTypeORMQuery(data: any): data is TypeORMQuery {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.sql === 'string' &&
      (data.parameters === undefined || Array.isArray(data.parameters))
    );
  }

  private isTypeORMError(data: any): data is TypeORMError {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.message === 'string' &&
      (data.code === undefined || typeof data.code === 'string')
    );
  }

  private isTypeORMEntity(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      data.constructor &&
      data.constructor.name &&
      (data.constructor.name.includes('Entity') ||
       data.constructor.name.includes('Model') ||
       data.id !== undefined)
    );
  }

  private isTypeORMRepository(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.find === 'function' &&
      typeof data.findOne === 'function' &&
      typeof data.save === 'function'
    );
  }

  private isTypeORMConnection(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.isConnected === 'function' &&
      typeof data.close === 'function'
    );
  }

  private assessQueryComplexity(query: TypeORMQuery): 'low' | 'medium' | 'high' {
    let complexity = 0;
    
    // Basado en el tipo de query
    if (query.queryType === 'SELECT') complexity += 1;
    else if (query.queryType === 'INSERT') complexity += 2;
    else if (query.queryType === 'UPDATE') complexity += 3;
    else if (query.queryType === 'DELETE') complexity += 3;
    
    // Basado en joins
    if (query.joins && query.joins.length > 0) {
      complexity += query.joins.length * 2;
    }
    
    // Basado en la longitud del SQL
    if (query.sql.length > 500) complexity += 2;
    else if (query.sql.length > 200) complexity += 1;
    
    // Basado en parámetros
    if (query.parameters && query.parameters.length > 10) complexity += 2;
    else if (query.parameters && query.parameters.length > 5) complexity += 1;
    
    if (complexity >= 6) return 'high';
    if (complexity >= 3) return 'medium';
    return 'low';
  }

  private assessEntityComplexity(entity: any): 'low' | 'medium' | 'high' {
    const keys = Object.keys(entity);
    if (keys.length > 20) return 'high';
    if (keys.length > 10) return 'medium';
    return 'low';
  }

  private serializeQuery(query: TypeORMQuery): any {
    return {
      type: 'TypeORMQuery',
      queryType: query.queryType || 'UNKNOWN',
      sql: query.sql, // SQL original, sin sanitizar
      parameters: query.parameters, // Parámetros originales, sin sanitizar
      table: query.table,
      alias: query.alias,
      joins: query.joins, // Datos originales, sin sanitizar
      where: query.where, // Datos originales, sin sanitizar
      orderBy: query.orderBy,
      limit: query.limit,
      offset: query.offset,
      complexity: this.assessQueryComplexity(query)
    };
  }

  private serializeError(error: TypeORMError): any {
    return {
      type: 'TypeORMError',
      code: error.code,
      message: error.message,
      query: error.query, // SQL original, sin sanitizar
      parameters: error.parameters, // Parámetros originales, sin sanitizar
      table: error.table,
      constraint: error.constraint,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      internalPosition: error.internalPosition,
      internalQuery: error.internalQuery, // SQL original, sin sanitizar
      where: error.where, // SQL original, sin sanitizar
      schema: error.schema,
      column: error.column,
      dataType: error.dataType
    };
  }

  private serializeEntity(entity: any): any {
    const serialized: any = {
      type: 'TypeORMEntity',
      entityName: entity.constructor?.name || 'UnknownEntity',
      id: entity.id,
      fields: {}
    };

    // Serializar campos del entity (datos originales, sin sanitizar)
    for (const [key, value] of Object.entries(entity)) {
      if (key !== 'constructor' && typeof value !== 'function') {
        serialized.fields[key] = value; // Valor original, sin sanitizar
      }
    }

    return serialized;
  }

  private serializeRepository(repo: any): any {
    return {
      type: 'TypeORMRepository',
      repositoryName: repo.constructor?.name || 'UnknownRepository',
      target: repo.target?.name || 'UnknownTarget',
      metadata: repo.metadata ? {
        tableName: repo.metadata.tableName,
        columns: repo.metadata.columns?.map((col: any) => col.propertyName) || [],
        relations: repo.metadata.relations?.map((rel: any) => rel.propertyName) || []
      } : undefined
    };
  }

  private serializeConnection(connection: any): any {
    return {
      type: 'TypeORMConnection',
      name: connection.name || 'default',
      isConnected: connection.isConnected ? connection.isConnected() : undefined,
      driver: connection.driver?.constructor?.name || 'UnknownDriver',
      options: connection.options ? {
        type: connection.options.type,
        host: connection.options.host,
        port: connection.options.port,
        database: connection.options.database,
        username: connection.options.username // Usuario original, sin sanitizar
      } : undefined
    };
  }
} 