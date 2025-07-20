import { connect, NatsConnection, Codec, StringCodec, headers as NatsHeaders } from 'nats';
import {
  IBrokerAdapter,
  BrokerMessage,
  MessageHandler,
} from '@syntropylog/types';

export class NatsAdapter implements IBrokerAdapter {
  private readonly natsServers: string[];
  private natsConnection: NatsConnection | null = null;
  private codec: Codec<string>;
  private subscriptions: Map<string, any> = new Map();

  constructor(natsServers: string[] = ['nats://localhost:4222']) {
    this.natsServers = natsServers;
    this.codec = StringCodec();
  }

  async connect(): Promise<void> {
    this.natsConnection = await connect({
      servers: this.natsServers,
    });
  }

  async disconnect(): Promise<void> {
    if (this.natsConnection) {
      // Unsubscribe from all topics first
      if (this.subscriptions.size > 0) {
        for (const [topic, subscription] of this.subscriptions) {
          try {
            subscription.unsubscribe();
            console.log(`✅ Cancelled NATS subscription for topic: ${topic}`);
          } catch (error) {
            console.warn(`⚠️ Error cancelling subscription for topic ${topic}:`, error);
          }
        }
        this.subscriptions.clear();
      }
      
      await this.natsConnection.drain();
      this.natsConnection.close();
      this.natsConnection = null;
    }
  }

  async publish(topic: string, message: BrokerMessage): Promise<void> {
    if (!this.natsConnection) {
      throw new Error('NATS connection is not available. Please connect first.');
    }

    const payload = typeof message.payload === 'string' 
      ? message.payload 
      : JSON.stringify(message.payload);

    const natsHeaders = this.recordToNatsHeaders(message.headers);
    
    await this.natsConnection.publish(
      topic,
      this.codec.encode(payload),
      { headers: natsHeaders }
    );
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    if (!this.natsConnection) {
      throw new Error('NATS connection is not available. Please connect first.');
    }

    const subscription = this.natsConnection.subscribe(topic);

    (async () => {
      for await (const msg of subscription) {
        const payload = this.codec.decode(msg.data);
        const headers = this.natsHeadersToRecord(msg.headers);

        const brokerMessage: BrokerMessage = {
          payload: Buffer.from(payload),
          headers,
        };

        const controls = {
          ack: async () => {
            // NATS doesn't require explicit ack for most use cases
            // but we can implement it if needed
          },
          nack: async () => {
            // NATS doesn't have a built-in nack mechanism
            // but we can implement custom logic if needed
            console.log(`NACK received for message on topic ${topic}.`);
          },
        };

        await handler(brokerMessage, controls);
      }
    })().catch(console.error);

    this.subscriptions.set(topic, subscription);
  }

  async unsubscribe(topic: string): Promise<void> {
    if (!this.natsConnection) {
      throw new Error('NATS connection is not available.');
    }

    const subscription = this.subscriptions.get(topic);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(topic);
      console.log(`✅ Unsubscribed from NATS topic: ${topic}`);
    } else {
      console.warn(`No active subscription found for topic: ${topic}`);
    }
  }

  private natsHeadersToRecord(natsHeaders: any | undefined): Record<string, string | Buffer> | undefined {
    if (!natsHeaders) {
      return undefined;
    }

    const record: Record<string, string | Buffer> = {};
    // NATS headers are iterable but don't have .entries() method
    for (const [key, value] of natsHeaders) {
      record[key] = value;
    }
    return record;
  }

  private recordToNatsHeaders(record: Record<string, string | Buffer> | undefined): any | undefined {
    if (!record) {
      return undefined;
    }

    const natsHeaders = NatsHeaders();
    for (const [key, value] of Object.entries(record)) {
      natsHeaders.set(key, String(value));
    }
    return natsHeaders;
  }
} 