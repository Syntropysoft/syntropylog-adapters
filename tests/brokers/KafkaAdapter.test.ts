import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KafkaAdapter } from '../../src/brokers/KafkaAdapter';

describe('KafkaAdapter', () => {
  let adapter: KafkaAdapter;
  let mockProducer: any;
  let mockConsumer: any;
  let mockKafka: any;

  beforeEach(() => {
    // Mock simple y directo
    mockProducer = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue([{ topicName: 'test-topic', partition: 0, baseOffset: '1' }])
    };

    mockConsumer = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      run: vi.fn().mockResolvedValue(undefined)
    };

    mockKafka = {
      producer: vi.fn().mockReturnValue(mockProducer),
      consumer: vi.fn().mockReturnValue(mockConsumer)
    };

    adapter = new KafkaAdapter(mockKafka, 'test-group');
  });

  describe('constructor', () => {
    it('should create adapter with producer and consumer', () => {
      expect(adapter).toBeInstanceOf(KafkaAdapter);
      expect(mockKafka.producer).toHaveBeenCalled();
      expect(mockKafka.consumer).toHaveBeenCalledWith({ groupId: 'test-group' });
    });
  });

  describe('connect', () => {
    it('should connect producer and consumer', async () => {
      await adapter.connect();
      
      expect(mockProducer.connect).toHaveBeenCalled();
      expect(mockConsumer.connect).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect producer and consumer', async () => {
      await adapter.disconnect();
      
      expect(mockProducer.disconnect).toHaveBeenCalled();
      expect(mockConsumer.disconnect).toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should pass Buffer payload directly to Kafka', async () => {
      const message = {
        payload: Buffer.from('test message'),
        headers: { 'content-type': 'application/json' }
      };

      await adapter.publish('test-topic', message);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'test-topic',
        messages: [{
          value: Buffer.from('test message'), // Buffer se pasa directamente
          headers: { 'content-type': 'application/json' }
        }]
      });
    });

    it('should pass string payload directly to Kafka', async () => {
      const message = {
        payload: 'test message',
        headers: { 'content-type': 'text/plain' }
      };

      await adapter.publish('test-topic', message);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'test-topic',
        messages: [{
          value: 'test message', // String se pasa directamente
          headers: { 'content-type': 'text/plain' }
        }]
      });
    });

    it('should pass object payload directly to Kafka', async () => {
      const message = {
        payload: { key: 'value', number: 123 },
        headers: { 'content-type': 'application/json' }
      };

      await adapter.publish('test-topic', message);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'test-topic',
        messages: [{
          value: { key: 'value', number: 123 }, // Object se pasa directamente
          headers: { 'content-type': 'application/json' }
        }]
      });
    });

    it('should handle message without headers', async () => {
      const message = {
        payload: 'test message',
        headers: undefined
      };

      await adapter.publish('test-topic', message);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'test-topic',
        messages: [{
          value: 'test message',
          headers: undefined
        }]
      });
    });

    it('should throw error if producer.send fails', async () => {
      const error = new Error('Producer error');
      mockProducer.send.mockRejectedValue(error);

      const message = {
        payload: 'test message',
        headers: {}
      };

      await expect(adapter.publish('test-topic', message))
        .rejects.toThrow('Producer error');
    });
  });

  describe('subscribe', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should subscribe to topic with correct parameters', async () => {
      const handler = vi.fn();
      
      await adapter.subscribe('test-topic', handler);

      expect(mockConsumer.subscribe).toHaveBeenCalledWith({
        topic: 'test-topic',
        fromBeginning: true // El adapter usa fromBeginning: true
      });
    });

    it('should start consumer when subscribing', async () => {
      const handler = vi.fn();
      
      await adapter.subscribe('test-topic', handler);

      expect(mockConsumer.run).toHaveBeenCalled();
    });

    it('should throw error if consumer.subscribe fails', async () => {
      const error = new Error('Subscribe error');
      mockConsumer.subscribe.mockRejectedValue(error);

      const handler = vi.fn();

      await expect(adapter.subscribe('test-topic', handler))
        .rejects.toThrow('Subscribe error');
    });

    it('should throw error if consumer.run fails', async () => {
      const error = new Error('Run error');
      mockConsumer.run.mockRejectedValue(error);

      const handler = vi.fn();

      await expect(adapter.subscribe('test-topic', handler))
        .rejects.toThrow('Run error');
    });
  });

  describe('error handling', () => {
    it('should handle connect errors gracefully', async () => {
      const error = new Error('Connection failed');
      mockProducer.connect.mockRejectedValue(error);

      await expect(adapter.connect()).rejects.toThrow('Connection failed');
    });

    it('should handle disconnect errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      mockProducer.disconnect.mockRejectedValue(error);

      await expect(adapter.disconnect()).rejects.toThrow('Disconnect failed');
    });
  });
}); 