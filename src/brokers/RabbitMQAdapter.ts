import * as amqplib from 'amqplib';
import type { Connection, Channel, ConsumeMessage, Options } from 'amqplib';
import { IBrokerAdapter, BrokerMessage, MessageHandler } from '@syntropylog/types';

export class RabbitMQAdapter implements IBrokerAdapter {
  private connection: any = null;
  private channel: Channel | null = null;
  private connectionString: string;
  private exchangeName: string;
  private consumerTags: Map<string, string> = new Map();

  constructor(connectionString: string, exchangeName = 'topic_logs') {
    this.connectionString = connectionString;
    this.exchangeName = exchangeName;
  }

  async connect(): Promise<void> {
    this.connection = await amqplib.connect(this.connectionString);
    if (!this.connection) {
      throw new Error('Failed to connect to RabbitMQ');
    }
    this.channel = await this.connection.createChannel();
    if (!this.channel) {
      throw new Error('Failed to create RabbitMQ channel');
    }
    await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
  }

  async disconnect(): Promise<void> {
    try {
        // Cancel all active consumers first
        if (this.channel && this.consumerTags.size > 0) {
            for (const [topic, consumerTag] of this.consumerTags) {
                try {
                    await this.channel.cancel(consumerTag);
                    console.log(`✅ Cancelled consumer for topic: ${topic}`);
                } catch (error) {
                    console.warn(`⚠️ Error cancelling consumer for topic ${topic}:`, error);
                }
            }
            this.consumerTags.clear();
        }
        
        // Close channel
        if (this.channel) {
            await this.channel.close();
        }
        
        // Close connection
        if (this.connection) {
            await this.connection.close();
        }
    } catch (error) {
        console.error('Error during RabbitMQ disconnection:', error);
    } finally {
        this.channel = null;
        this.connection = null;
    }
  }

  async publish(topic: string, message: BrokerMessage): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available. Please connect first.');
    }
    const routingKey = topic;
    const content = Buffer.isBuffer(message.payload) ? message.payload : Buffer.from(JSON.stringify(message.payload));
    const options = {
      headers: message.headers || {},
      persistent: true,
    };
    this.channel.publish(this.exchangeName, routingKey, content, options);
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available. Please connect first.');
    }
    const q = await this.channel.assertQueue('', { exclusive: true });
    await this.channel.bindQueue(q.queue, this.exchangeName, topic);

    const { consumerTag } = await this.channel.consume(q.queue,
      async (msg: ConsumeMessage | null) => {
        if (msg && this.channel) {
          const brokerMessage: BrokerMessage = {
            payload: msg.content,
            headers: msg.properties.headers,
          };
          const ack = async () => this.channel!.ack(msg);
          const nack = async (requeue = false) => this.channel!.nack(msg, false, requeue);
          await handler(brokerMessage, { ack, nack });
        }
      },
      { noAck: false }
    );
    this.consumerTags.set(topic, consumerTag);
  }

  async unsubscribe(topic: string): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available.');
    }
    const consumerTag = this.consumerTags.get(topic);
    if (consumerTag) {
      await this.channel.cancel(consumerTag);
      this.consumerTags.delete(topic);
    } else {
      console.warn(`No active subscription found for topic: ${topic}`);
    }
  }
} 