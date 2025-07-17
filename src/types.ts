// Tipos para el sistema de serialización

export interface SerializationContext {
  sanitize?: boolean;
  sensitiveFields?: string[];
  maxDepth?: number;
  timeout?: number;
}

export interface SerializationResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    serializer: string;
    complexity: 'low' | 'medium' | 'high';
    duration: number;
    timestamp: string;
  };
}

export interface ISerializer {
  name: string;
  priority: number;
  
  canSerialize(data: any): boolean;
  getComplexity(data: any): 'low' | 'medium' | 'high';
  getTimeout(data: any): number | null;
  serialize(data: any, context: SerializationContext): Promise<SerializationResult>;
}

// Tipos para el pipeline de serialización
export interface SerializationStep {
  name: string;
  execute(data: any, context: SerializationContext): Promise<any>;
}

export interface SerializationPipeline {
  steps: SerializationStep[];
  addStep(step: SerializationStep): void;
  execute(data: any, context: SerializationContext): Promise<SerializationResult>;
}

// Tipos para estrategias de timeout
export interface TimeoutStrategy {
  name: string;
  calculateTimeout(data: any, context: SerializationContext): number;
}

// Tipos para métricas
export interface SerializationMetrics {
  totalSerializations: number;
  successfulSerializations: number;
  failedSerializations: number;
  averageDuration: number;
  totalDuration: number;
  serializerStats: Record<string, {
    count: number;
    averageDuration: number;
    totalDuration: number;
  }>;
} 