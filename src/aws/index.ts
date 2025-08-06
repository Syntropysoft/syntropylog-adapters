/**
 * @file src/aws/index.ts
 * @description AWS adapters for SyntropyLog framework
 */

// Export all AWS adapters
export { CloudWatchAdapter, type CloudWatchAdapterConfig } from './CloudWatchAdapter';
export { XRayAdapter, type XRayAdapterConfig } from './XRayAdapter';
export { S3Adapter, type S3AdapterConfig } from './S3Adapter';
export { MQTTAdapter, type MQTTAdapterConfig, type MQTTMessage, type IMQTTAdapter } from './MQTTAdapter';

// Re-export AWS SDK clients for convenience
export { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
export { XRayClient } from '@aws-sdk/client-xray';
export { S3Client } from '@aws-sdk/client-s3';
export { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';

// Re-export our custom interfaces
export type { TraceContext, TraceSpan, ITracer } from './XRayAdapter';
export type { StorageMetadata, StorageObject, IStorage } from './S3Adapter'; 