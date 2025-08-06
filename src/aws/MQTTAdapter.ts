import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane';

export interface MQTTAdapterConfig {
  client: IoTDataPlaneClient;
  topicPrefix?: string;
  qos?: number;
  retain?: boolean;
}

export interface MQTTMessage {
  topic: string;
  payload: string | Buffer;
  qos?: number;
  retain?: boolean;
}

export interface IMQTTAdapter {
  publish(message: MQTTMessage): Promise<void>;
  publishBatch(messages: MQTTMessage[]): Promise<void>;
  getTopicPrefix(): string;
}

export class MQTTAdapter implements IMQTTAdapter {
  private client: IoTDataPlaneClient;
  private topicPrefix: string;
  private defaultQos: number;
  private defaultRetain: boolean;

  constructor(config: MQTTAdapterConfig) {
    this.client = config.client;
    this.topicPrefix = config.topicPrefix || 'syntropylog';
    this.defaultQos = config.qos || 1;
    this.defaultRetain = config.retain || false;
  }

  /**
   * Publish a single message to AWS IoT Core
   */
  async publish(message: MQTTMessage): Promise<void> {
    const fullTopic = this.buildTopic(message.topic);
    const payload = typeof message.payload === 'string' 
      ? Buffer.from(message.payload, 'utf8')
      : message.payload;

    const command = new PublishCommand({
      topic: fullTopic,
      payload: payload,
      qos: message.qos ?? this.defaultQos,
      retain: message.retain ?? this.defaultRetain,
    });

    try {
      await this.client.send(command);
    } catch (error) {
      throw new Error(`Failed to publish MQTT message to ${fullTopic}: ${error}`);
    }
  }

  /**
   * Publish multiple messages in batch
   */
  async publishBatch(messages: MQTTMessage[]): Promise<void> {
    const promises = messages.map(message => this.publish(message));
    await Promise.all(promises);
  }

  /**
   * Get the current topic prefix
   */
  getTopicPrefix(): string {
    return this.topicPrefix;
  }

  /**
   * Build the full topic name with prefix
   */
  private buildTopic(topic: string): string {
    if (topic.startsWith('/')) {
      return `${this.topicPrefix}${topic}`;
    }
    return `${this.topicPrefix}/${topic}`;
  }

  /**
   * Publish a log message
   */
  async publishLog(level: string, message: string, metadata?: Record<string, any>): Promise<void> {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: metadata || {},
    };

    await this.publish({
      topic: 'logs',
      payload: JSON.stringify(payload),
      qos: 1,
      retain: false,
    });
  }

  /**
   * Publish a trace message
   */
  async publishTrace(traceId: string, spanId: string, operation: string, metadata?: Record<string, any>): Promise<void> {
    const payload = {
      timestamp: new Date().toISOString(),
      traceId,
      spanId,
      operation,
      metadata: metadata || {},
    };

    await this.publish({
      topic: 'traces',
      payload: JSON.stringify(payload),
      qos: 1,
      retain: false,
    });
  }

  /**
   * Publish a metric message
   */
  async publishMetric(name: string, value: number, unit?: string, metadata?: Record<string, any>): Promise<void> {
    const payload = {
      timestamp: new Date().toISOString(),
      name,
      value,
      unit: unit || 'count',
      metadata: metadata || {},
    };

    await this.publish({
      topic: 'metrics',
      payload: JSON.stringify(payload),
      qos: 1,
      retain: false,
    });
  }
} 