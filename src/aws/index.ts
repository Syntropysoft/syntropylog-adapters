/**
 * @file src/aws/index.ts
 * @description AWS adapters for SyntropyLog framework
 */

// Export all AWS adapters
export { CloudWatchAdapter, type CloudWatchAdapterConfig } from './CloudWatchAdapter';
export { XRayAdapter, type XRayAdapterConfig } from './XRayAdapter';
export { S3Adapter, type S3AdapterConfig } from './S3Adapter';

// Re-export AWS SDK clients for convenience
export { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
export { XRayClient } from '@aws-sdk/client-xray';
export { S3Client } from '@aws-sdk/client-s3';

// Re-export our custom interfaces
export type { TraceContext, TraceSpan, ITracer } from './XRayAdapter';
export type { StorageMetadata, StorageObject, IStorage } from './S3Adapter'; 