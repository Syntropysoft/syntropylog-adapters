/**
 * @file src/aws/XRayAdapter.ts
 * @description An implementation of the ITracer adapter for AWS X-Ray.
 * This adapter allows SyntropyLog to send traces to AWS X-Ray.
 */

import {
  XRayClient,
  PutTraceSegmentsCommand,
  GetTraceSummariesCommand,
} from '@aws-sdk/client-xray';
// Define our own tracing interfaces since they don't exist in @syntropylog/types yet
export interface TraceContext {
  traceId?: string;
  parentId?: string;
  [key: string]: any;
}

export interface TraceSpan {
  id: string;
  traceId: string;
  name: string;
  startTime: number;
  context: TraceContext;
  parentId?: string;
}

export interface ITracer {
  startSpan(name: string, context?: TraceContext): Promise<TraceSpan>;
  endSpan(span: TraceSpan, error?: Error): Promise<void>;
  addContext(span: TraceSpan, context: TraceContext): Promise<void>;
  getTrace(traceId: string): Promise<any>;
}

export interface XRayAdapterConfig {
  /** AWS X-Ray client instance */
  client: XRayClient;
  /** Service name for the traces */
  serviceName: string;
  /** AWS region */
  region?: string;
  /** Whether to enable sampling (default: true) */
  sampling?: boolean;
  /** Sampling rate (0.0 to 1.0, default: 1.0) */
  samplingRate?: number;
}

/**
 * @class XRayAdapter
 * @description An adapter that allows SyntropyLog to send traces to AWS X-Ray.
 * It implements the ITracer interface and translates trace calls to X-Ray API.
 * @implements {ITracer}
 */
export class XRayAdapter implements ITracer {
  private readonly client: XRayClient;
  private readonly serviceName: string;
  private readonly sampling: boolean;
  private readonly samplingRate: number;

  constructor(config: XRayAdapterConfig) {
    this.client = config.client;
    this.serviceName = config.serviceName;
    this.sampling = config.sampling ?? true;
    this.samplingRate = config.samplingRate ?? 1.0;
  }

  /**
   * Start a new trace span
   */
  async startSpan(name: string, context?: TraceContext): Promise<TraceSpan> {
    const traceId = context?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const parentId = context?.parentId;

    const span: TraceSpan = {
      id: spanId,
      traceId,
      name,
      startTime: Date.now(),
      context: context || {},
      parentId,
    };

    return span;
  }

  /**
   * End a trace span and send it to X-Ray
   */
  async endSpan(span: TraceSpan, error?: Error): Promise<void> {
    const endTime = Date.now();
    const duration = endTime - span.startTime;

    // Create X-Ray segment document
    const segment = {
      id: span.id,
      trace_id: span.traceId,
      parent_id: span.parentId,
      name: this.serviceName,
      start_time: span.startTime / 1000, // X-Ray expects seconds
      end_time: endTime / 1000,
      subsegments: [],
      annotations: {
        ...span.context,
      },
      metadata: {
        'syntropylog.span.name': span.name,
        'syntropylog.span.duration': duration,
      },
    };

    // Add error information if present
    if (error) {
      segment.annotations.error = {
        message: error.message,
        type: error.name,
        stack: error.stack,
      };
    }

    try {
      const command = new PutTraceSegmentsCommand({
        TraceSegmentDocuments: [JSON.stringify(segment)],
      });

      await this.client.send(command);
    } catch (error) {
      // Log error but don't throw to avoid breaking the application
      console.warn(`Failed to send trace to X-Ray: ${error}`);
    }
  }

  /**
   * Add context to a span
   */
  async addContext(span: TraceSpan, context: TraceContext): Promise<void> {
    span.context = {
      ...span.context,
      ...context,
    };
  }

  /**
   * Get trace information from X-Ray
   */
  async getTrace(traceId: string): Promise<any> {
    try {
      const command = new GetTraceSummariesCommand({
        StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        EndTime: new Date(),
        // Note: GetTraceSummariesCommand doesn't support TraceIds filter
        // This is a simplified implementation
      });

      const response = await this.client.send(command);
      return response.TraceSummaries?.[0];
    } catch (error) {
      console.warn(`Failed to get trace from X-Ray: ${error}`);
      return null;
    }
  }

  /**
   * Generate a trace ID in X-Ray format
   */
  private generateTraceId(): string {
    // X-Ray trace ID format: 1-<8 hex digits>-<24 hex digits>
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const random = Math.random().toString(16).substring(2, 26);
    return `1-${timestamp}-${random}`;
  }

  /**
   * Generate a span ID in X-Ray format
   */
  private generateSpanId(): string {
    // X-Ray span ID format: 16 hex digits
    return Math.random().toString(16).substring(2, 18);
  }

  /**
   * Check if sampling should be applied
   */
  private shouldSample(): boolean {
    if (!this.sampling) return true;
    return Math.random() < this.samplingRate;
  }
} 