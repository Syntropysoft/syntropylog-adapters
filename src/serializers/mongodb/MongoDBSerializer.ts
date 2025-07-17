import { ISerializer, SerializationContext, SerializationResult } from '../../types';

export interface MongoDBQueryData {
  collection?: string;
  operation?: string;
  filter?: any;
  projection?: any;
  sort?: any;
  limit?: number;
  skip?: number;
  update?: any;
  options?: any;
  duration?: number;
  documentsAffected?: number;
  documentsReturned?: number;
}

export interface MongoDBAggregationData {
  collection?: string;
  pipeline?: any[];
  options?: any;
  duration?: number;
  documentsReturned?: number;
  stages?: string[];
}

export interface MongoDBErrorData {
  code?: number;
  codeName?: string;
  message: string;
  stack?: string;
  operation?: string;
  collection?: string;
  filter?: any;
  pipeline?: any[];
  writeErrors?: any[];
  writeConcernErrors?: any[];
}

export class MongoDBSerializer implements ISerializer {
  name = 'mongodb';
  priority = 70;

  canSerialize(data: any): boolean {
    return (
      this.isMongoDBQuery(data) ||
      this.isMongoDBAggregation(data) ||
      this.isMongoDBError(data)
    );
  }

  getComplexity(data: any): 'low' | 'medium' | 'high' {
    if (this.isMongoDBQuery(data)) {
      return this.assessQueryComplexity(data);
    }
    if (this.isMongoDBAggregation(data)) {
      return this.assessAggregationComplexity(data);
    }
    if (this.isMongoDBError(data)) {
      return 'low';
    }
    return 'low';
  }

  // ✅ Timeout ultra-bajo: solo para desenmarañar objetos
  getTimeout(data: any): number | null {
    return 10; // 10ms máximo para desenmarañar cualquier objeto MongoDB
  }

  async serialize(data: any, context: SerializationContext): Promise<SerializationResult> {
    const startTime = Date.now();
    
    try {
      let result: any;

      if (this.isMongoDBQuery(data)) {
        result = this.serializeQuery(data);
      } else if (this.isMongoDBAggregation(data)) {
        result = this.serializeAggregation(data);
      } else if (this.isMongoDBError(data)) {
        result = this.serializeError(data);
      } else {
        throw new Error('Tipo de dato MongoDB no reconocido');
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
        error: error instanceof Error ? error.message : 'Error desconocido en serialización MongoDB',
        metadata: {
          serializer: this.name,
          complexity: this.getComplexity(data),
          duration,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private isMongoDBQuery(data: any): data is MongoDBQueryData {
    return data && (
      data.collection !== undefined ||
      data.operation !== undefined ||
      data.filter !== undefined ||
      data.projection !== undefined ||
      data.update !== undefined
    );
  }

  private isMongoDBAggregation(data: any): data is MongoDBAggregationData {
    return data && (
      data.pipeline !== undefined ||
      data.stages !== undefined
    );
  }

  private isMongoDBError(data: any): data is MongoDBErrorData {
    return data && (
      data.code !== undefined ||
      data.codeName !== undefined ||
      data.writeErrors !== undefined ||
      data.writeConcernErrors !== undefined ||
      (data.message && typeof data.message === 'string')
    );
  }

  private assessQueryComplexity(query: MongoDBQueryData): 'low' | 'medium' | 'high' {
    let complexity = 0;
    
    // Basado en la operación
    if (query.operation === 'find') complexity += 1;
    else if (query.operation === 'findOne') complexity += 1;
    else if (query.operation === 'insertOne') complexity += 2;
    else if (query.operation === 'insertMany') complexity += 3;
    else if (query.operation === 'updateOne') complexity += 2;
    else if (query.operation === 'updateMany') complexity += 3;
    else if (query.operation === 'deleteOne') complexity += 2;
    else if (query.operation === 'deleteMany') complexity += 3;
    else if (query.operation === 'replaceOne') complexity += 2;
    else if (query.operation === 'bulkWrite') complexity += 4;
    
    // Basado en argumentos complejos
    if (query.filter && typeof query.filter === 'object') {
      const filterKeys = Object.keys(query.filter);
      complexity += Math.min(filterKeys.length, 3);
    }
    if (query.projection) complexity += 1;
    if (query.sort) complexity += 1;
    if (query.limit) complexity += 1;
    if (query.skip) complexity += 1;
    if (query.update && typeof query.update === 'object') {
      const updateKeys = Object.keys(query.update);
      complexity += Math.min(updateKeys.length, 2);
    }
    
    if (complexity >= 6) return 'high';
    if (complexity >= 3) return 'medium';
    return 'low';
  }

  private assessAggregationComplexity(aggregation: MongoDBAggregationData): 'low' | 'medium' | 'high' {
    let complexity = 0;
    
    if (aggregation.pipeline && Array.isArray(aggregation.pipeline)) {
      complexity += aggregation.pipeline.length;
    }
    if (aggregation.stages && Array.isArray(aggregation.stages)) {
      complexity += aggregation.stages.length;
    }
    
    if (complexity >= 8) return 'high';
    if (complexity >= 4) return 'medium';
    return 'low';
  }

  private serializeQuery(data: MongoDBQueryData): any {
    return {
      type: 'MongoDBQuery',
      collection: data.collection,
      operation: data.operation,
      filter: data.filter, // Datos originales, sin sanitizar
      projection: data.projection,
      sort: data.sort,
      update: data.update,
      limit: data.limit,
      skip: data.skip,
      duration: data.duration,
      documentsAffected: data.documentsAffected,
      documentsReturned: data.documentsReturned,
      complexity: this.assessQueryComplexity(data)
    };
  }

  private serializeAggregation(data: MongoDBAggregationData): any {
    return {
      type: 'MongoDBAggregation',
      collection: data.collection,
      pipeline: data.pipeline, // Datos originales, sin sanitizar
      stages: data.stages,
      duration: data.duration,
      documentsReturned: data.documentsReturned,
      complexity: this.assessAggregationComplexity(data)
    };
  }

  private serializeError(data: MongoDBErrorData): any {
    return {
      type: 'MongoDBError',
      code: data.code,
      codeName: data.codeName,
      message: data.message,
      operation: data.operation,
      collection: data.collection,
      filter: data.filter, // Datos originales, sin sanitizar
      pipeline: data.pipeline,
      writeErrors: data.writeErrors,
      writeConcernErrors: data.writeConcernErrors
    };
  }

  private sanitizePipeline(pipeline?: any[]): any[] | undefined {
    if (!pipeline || !Array.isArray(pipeline)) return pipeline;

    return pipeline.map(stage => {
      if (typeof stage === 'object' && stage !== null) {
        return this.sanitizeObject(stage);
      }
      return stage;
    });
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const result: any = Array.isArray(obj) ? [] : {};
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'credential', 
      'hash', 'salt', 'encryption', 'private', 'sensitive'
    ];
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
      
      if (isSensitive) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
} 