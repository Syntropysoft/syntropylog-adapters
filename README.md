<p align="center">
  <img src="https://raw.githubusercontent.com/Syntropysoft/syntropylog-examples-/main/assets/syntropyLog-logo.png" alt="SyntropyLog Logo" width="170"/>
</p>

# @syntropylog/adapters

External adapters for SyntropyLog framework - Brokers, HTTP clients, and Database Serializers.

## 🚀 Installation

```bash
npm install @syntropylog/adapters
```

## 📦 Usage

### Import Everything
```typescript
import { 
  KafkaAdapter, 
  PrismaSerializer, 
  AxiosAdapter 
} from '@syntropylog/adapters';
```

### Import by Category (Recommended for tree-shaking)

#### Brokers Only
```typescript
import { KafkaAdapter, NatsAdapter, RabbitMQAdapter } from '@syntropylog/adapters/brokers';
```

#### HTTP Clients Only
```typescript
import { AxiosAdapter, FetchAdapter, GotAdapter } from '@syntropylog/adapters/http';
```

#### Serializers Only
```typescript
import { 
  PrismaSerializer, 
  TypeORMSerializer, 
  MySQLSerializer,
  PostgreSQLSerializer,
  SQLServerSerializer,
  OracleSerializer,
  MongoDBSerializer
} from '@syntropylog/adapters/serializers';
```

#### Types Only
```typescript
import type { ISerializer, SerializationContext, SerializationResult } from '@syntropylog/adapters/types';
```

## 🔧 Available Adapters

### Brokers
- **KafkaAdapter** - Apache Kafka integration
- **NatsAdapter** - NATS messaging system
- **RabbitMQAdapter** - RabbitMQ message broker

### HTTP Clients
- **AxiosAdapter** - Axios HTTP client
- **FetchAdapter** - Native fetch API
- **GotAdapter** - Got HTTP client

### Database Serializers
- **PrismaSerializer** - Prisma ORM queries and errors
- **TypeORMSerializer** - TypeORM queries and errors
- **MySQLSerializer** - MySQL queries and errors
- **PostgreSQLSerializer** - PostgreSQL queries and errors
- **SQLServerSerializer** - SQL Server queries and errors
- **OracleSerializer** - Oracle Database queries and errors
- **MongoDBSerializer** - MongoDB queries and aggregations

## 🎯 Quick Examples

### Using Brokers
```typescript
import { KafkaAdapter } from '@syntropylog/adapters/brokers';

const kafkaAdapter = new KafkaAdapter({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

await kafkaAdapter.connect();
await kafkaAdapter.publish('my-topic', { message: 'Hello World' });
```

### Using HTTP Clients
```typescript
import { AxiosAdapter } from '@syntropylog/adapters/http';
import axios from 'axios';

const axiosAdapter = new AxiosAdapter(axios);
const response = await axiosAdapter.request({
  url: 'https://api.example.com/users',
  method: 'GET'
});
```

### Using Serializers
```typescript
import { PrismaSerializer } from '@syntropylog/adapters/serializers';

const prismaSerializer = new PrismaSerializer();
const result = await prismaSerializer.serialize(prismaQuery, {
  sanitize: true,
  sensitiveFields: ['password', 'token']
});
```

## 🔄 Helper Functions

### Register All Serializers
```typescript
import { registerAllSerializers } from '@syntropylog/adapters/serializers';

// Register all serializers with a manager
registerAllSerializers(serializationManager);
```

### Get All Serializers
```typescript
import { getAllSerializers } from '@syntropylog/adapters/serializers';

const allSerializers = getAllSerializers();
// Returns array of all serializer instances
```

## 📋 Requirements

- Node.js >= 18
- TypeScript >= 5.0
- SyntropyLog >= 0.5.0

## 🔗 Dependencies

### Peer Dependencies
- `syntropylog` ^0.5.0

### Runtime Dependencies
- `axios` ^1.10.0
- `got` ^12.0.0
- `kafkajs` ^2.2.4
- `nats` ^2.17.0
- `amqplib` ^0.10.8
- `request` ^2.88.2

## 📄 License

Apache-2.0 - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines. 