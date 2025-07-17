// Importar todos los serializadores
import { PrismaSerializer } from './prisma/PrismaSerializer';
import { TypeORMSerializer } from './typeorm/TypeORMSerializer';
import { MySQLSerializer } from './mysql/MySQLSerializer';
import { PostgreSQLSerializer } from './postgres/PostgreSQLSerializer';
import { SQLServerSerializer } from './sqlserver/SQLServerSerializer';
import { OracleSerializer } from './oracle/OracleSerializer';
import { MongoDBSerializer } from './mongodb/MongoDBSerializer';

// Exportar todos los serializadores de bases de datos
export { PrismaSerializer } from './prisma/PrismaSerializer';
export { TypeORMSerializer } from './typeorm/TypeORMSerializer';
export { MySQLSerializer } from './mysql/MySQLSerializer';
export { PostgreSQLSerializer } from './postgres/PostgreSQLSerializer';
export { SQLServerSerializer } from './sqlserver/SQLServerSerializer';
export { OracleSerializer } from './oracle/OracleSerializer';
export { MongoDBSerializer } from './mongodb/MongoDBSerializer';

// Exportar tipos comunes
export type { ISerializer, SerializationContext, SerializationResult } from '../types';

// Función helper para registrar todos los serializadores
export function registerAllSerializers(manager: any): void {
  const serializers = [
    new PrismaSerializer(),
    new TypeORMSerializer(),
    new MySQLSerializer(),
    new PostgreSQLSerializer(),
    new SQLServerSerializer(),
    new OracleSerializer(),
    new MongoDBSerializer()
  ];

  serializers.forEach(serializer => {
    if (manager.register) {
      manager.register(serializer);
    }
  });
}

// Función helper para obtener todos los serializadores
export function getAllSerializers() {
  return [
    new PrismaSerializer(),
    new TypeORMSerializer(),
    new MySQLSerializer(),
    new PostgreSQLSerializer(),
    new SQLServerSerializer(),
    new OracleSerializer(),
    new MongoDBSerializer()
  ];
} 