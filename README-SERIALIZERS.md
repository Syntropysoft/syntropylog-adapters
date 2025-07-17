<p align="center">
  <img src="https://raw.githubusercontent.com/Syntropysoft/syntropylog-examples-/main/assets/syntropyLog-logo.png" alt="SyntropyLog Logo" width="170"/>
</p>

# Database Serializers for SyntropyLog

This module provides specialized serializers for different ORMs and databases, enabling smarter and safer logging of database operations.

## Features

- **Automatic sanitization**: Automatically removes sensitive information such as passwords, tokens, and secrets
- **Structured format**: Provides structured, easy-to-analyze logs
- **Error support**: Handles both successful queries and database errors
- **Extensible**: Easily extendable for new ORMs or databases

## Available Serializers

### PrismaSerializer
Serializes Prisma ORM queries and errors.

```typescript
import { PrismaSerializer, registerPrismaSerializer } from 'syntropylog-adapters';

// Register the serializer
registerPrismaSerializer(syntropyLog.serializerRegistry);

// Prisma data will be automatically serialized
syntropyLog.logger.info('Query executed', { query: prismaQueryData });
```

### TypeORMSerializer
Serializes TypeORM queries and errors.

```typescript
import { TypeORMSerializer, registerTypeORMSerializer } from 'syntropylog-adapters';

// Register the serializer
registerTypeORMSerializer(syntropyLog.serializerRegistry);

// TypeORM data will be automatically serialized
syntropyLog.logger.info('Query executed', { query: typeormQueryData });
```

### MongoDBSerializer
Serializes MongoDB queries, aggregations, and errors.

```typescript
import { MongoDBSerializer, registerMongoDBSerializer } from 'syntropylog-adapters';

// Register the serializer
registerMongoDBSerializer(syntropyLog.serializerRegistry);

// MongoDB data will be automatically serialized
syntropyLog.logger.info('Query executed', { query: mongoQueryData });
syntropyLog.logger.info('Aggregation completed', { aggregation: mongoAggregationData });
```

## Quick Usage

```typescript
import { syntropyLog, CompactConsoleTransport } from 'syntropylog';
import { registerDatabaseSerializers } from 'syntropylog-adapters';

// Initialize SyntropyLog
await syntropyLog.init({
  logger: {
    level: 'info',
    serviceName: 'my-app',
    transports: [new CompactConsoleTransport()]
  }
});

// Register all database serializers
registerDatabaseSerializers(syntropyLog.serializerRegistry);

// Now all database data will be automatically serialized
syntropyLog.logger.info('Database operation', { 
  query: prismaQueryData,
  error: mysqlErrorData 
});
```

## Automatically Redacted Sensitive Fields

The following fields are automatically redacted in all serializers:

- `password`
- `token`
- `secret`
- `key`
- `auth`
- `credential`
- `hash`
- `salt`
- `encryption`
- `private`
- `sensitive`

## Creating Custom Serializers

You can create custom serializers by implementing the `ISerializer` interface:

```typescript
import { ISerializer } from 'syntropylog';

export class MyCustomSerializer implements ISerializer {
  name = 'my-custom';

  serialize(data: any): string {
    // Your serialization logic here
    return JSON.stringify(this.sanitizeData(data));
  }

  private sanitizeData(data: any): any {
    // Your sanitization logic here
    return data;
  }
}

// Register your custom serializer
syntropyLog.serializerRegistry.register(new MyCustomSerializer());
```

## Output Examples

### Prisma Query
```json
{
  "type": "prisma_query",
  "model": "User",
  "action": "findMany",
  "clientMethod": "findMany",
  "duration": 45,
  "args": {
    "where": {
      "email": "user@example.com",
      "password": "[REDACTED]"
    }
  }
}
```

### TypeORM Error
```json
{
  "type": "typeorm_error",
  "code": "ER_ACCESS_DENIED_ERROR",
  "errno": 1045,
  "sqlState": "28000",
  "message": "Access denied for user",
  "query": "SELECT * FROM users WHERE password = '[REDACTED]'"
}
```

### MongoDB Query
```json
{
  "type": "mongodb_query",
  "collection": "users",
  "operation": "find",
  "filter": {
    "email": "user@example.com",
    "password": "[REDACTED]"
  },
  "projection": {
    "password": 0,
    "_id": 1,
    "email": 1,
    "name": 1
  },
  "limit": 10,
  "duration": 35,
  "documentsReturned": 1
}
```

### MongoDB Aggregation
```json
{
  "type": "mongodb_aggregation",
  "collection": "orders",
  "pipeline": [
    {
      "$match": {
        "userId": "123",
        "secret": "[REDACTED]"
      }
    },
    {
      "$group": {
        "_id": "$status",
        "total": { "$sum": "$amount" }
      }
    }
  ],
  "stages": ["$match", "$group", "$sort"],
  "duration": 42,
  "documentsReturned": 5
}
```

## Installation

```bash
npm install syntropylog-adapters
```

## Contributing

To add support for a new ORM or database:

1. Create a new serializer in `src/serializers/[name]/`
2. Implement the `ISerializer` interface
3. Add sensitive field sanitization
4. Export the serializer in `src/serializers/index.ts`
5. Update this documentation

## License

MIT 