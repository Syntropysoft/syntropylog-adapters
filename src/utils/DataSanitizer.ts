export interface SanitizationContext {
  sensitiveFields?: string[];
  redactPatterns?: RegExp[];
  maxStringLength?: number;
  enableDeepSanitization?: boolean;
}

export class DataSanitizer {
  private defaultSensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'credential', 
    'api_key', 'private_key', 'connection_string', 'wallet_location',
    'access_token', 'refresh_token', 'authorization', 'bearer'
  ];

  private defaultRedactPatterns = [
    /password\s*=\s*['"][^'"]*['"]/gi,
    /user\s*=\s*['"][^'"]*['"]/gi,
    /token\s*=\s*['"][^'"]*['"]/gi,
    /secret\s*=\s*['"][^'"]*['"]/gi,
    /\/[^\/@]*@/g // Para connection strings
  ];

  sanitize(data: any, context: SanitizationContext = {}): any {
    const config = this.mergeConfig(context);
    
    if (typeof data === 'string') {
      return this.sanitizeString(data, config);
    }
    
    if (typeof data === 'object' && data !== null) {
      return this.sanitizeObject(data, config);
    }
    
    return data;
  }

  sanitizeString(str: string, config: Required<SanitizationContext>): string {
    if (!str) return str;

    let sanitized = str;

    // Aplicar patrones de redacción
    config.redactPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, (match) => {
        if (match.includes('password')) return "password='[REDACTED]'";
        if (match.includes('user')) return "user='[REDACTED]'";
        if (match.includes('token')) return "token='[REDACTED]'";
        if (match.includes('secret')) return "secret='[REDACTED]'";
        return match.replace(/\/[^\/@]*@/, '/[REDACTED]@');
      });
    });

    // Limitar longitud si es necesario
    if (config.maxStringLength && sanitized.length > config.maxStringLength) {
      return `[STRING_LENGTH_${sanitized.length}]`;
    }

    return sanitized;
  }

  sanitizeObject(obj: any, config: Required<SanitizationContext>): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitize(item, config));
    }

    const result: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = config.sensitiveFields.some(field => 
        lowerKey.includes(field)
      );
      
      if (isSensitive) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = config.enableDeepSanitization 
          ? this.sanitizeObject(value, config)
          : value;
      } else if (typeof value === 'string') {
        result[key] = this.sanitizeString(value, config);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  sanitizeSQL(sql: string, context: SanitizationContext = {}): string {
    if (!sql) return sql;

    const config = this.mergeConfig(context);
    let sanitized = sql;

    // Remover comentarios SQL
    sanitized = sanitized.replace(/--.*$/gm, '');
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Aplicar sanitización de strings
    sanitized = this.sanitizeString(sanitized, config);
    
    // Normalizar espacios
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    return sanitized;
  }

  sanitizeParameters(parameters: any[], context: SanitizationContext = {}): any[] {
    const config = this.mergeConfig(context);
    
    return parameters.map(param => {
      if (typeof param === 'string') {
        return this.sanitizeString(param, config);
      }
      if (typeof param === 'object' && param !== null) {
        return this.sanitizeObject(param, config);
      }
      return param;
    });
  }

  sanitizeConnectionString(connectionString: string, context: SanitizationContext = {}): string {
    if (!connectionString) return connectionString;

    const config = this.mergeConfig(context);
    let sanitized = connectionString;

    // Remover credenciales de la cadena de conexión
    sanitized = sanitized.replace(/\/[^\/@]*@/g, '/[REDACTED]@');
    sanitized = sanitized.replace(/password\s*=\s*[^;]*/gi, "password=[REDACTED]");
    sanitized = sanitized.replace(/user\s*=\s*[^;]*/gi, "user=[REDACTED]");
    
    return this.sanitizeString(sanitized, config);
  }

  private mergeConfig(context: SanitizationContext): Required<SanitizationContext> {
    return {
      sensitiveFields: context.sensitiveFields || this.defaultSensitiveFields,
      redactPatterns: context.redactPatterns || this.defaultRedactPatterns,
      maxStringLength: context.maxStringLength || 300,
      enableDeepSanitization: context.enableDeepSanitization ?? true
    };
  }
} 