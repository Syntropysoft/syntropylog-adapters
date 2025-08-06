/**
 * @file src/aws/S3Adapter.ts
 * @description An implementation of the IStorage adapter for AWS S3.
 * This adapter allows SyntropyLog to store data in AWS S3 buckets.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
// Define our own storage interfaces since they don't exist in @syntropylog/types yet
export interface StorageMetadata {
  [key: string]: string;
}

export interface StorageObject {
  key: string;
  data: string;
  metadata: StorageMetadata;
  contentType?: string;
  size?: string;
  lastModified?: string;
  etag?: string;
}

export interface IStorage {
  store(key: string, data: any, metadata?: StorageMetadata): Promise<void>;
  retrieve(key: string): Promise<StorageObject | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
  getMetadata(key: string): Promise<StorageMetadata | null>;
}

export interface S3AdapterConfig {
  /** AWS S3 client instance */
  client: S3Client;
  /** S3 bucket name */
  bucketName: string;
  /** AWS region */
  region?: string;
  /** Default prefix for objects (optional) */
  prefix?: string;
  /** Default content type for objects */
  contentType?: string;
  /** Whether to enable encryption (default: true) */
  encryption?: boolean;
}

/**
 * @class S3Adapter
 * @description An adapter that allows SyntropyLog to store data in AWS S3.
 * It implements the IStorage interface and translates storage calls to S3 API.
 * @implements {IStorage}
 */
export class S3Adapter implements IStorage {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly prefix: string;
  private readonly contentType: string;
  private readonly encryption: boolean;

  constructor(config: S3AdapterConfig) {
    this.client = config.client;
    this.bucketName = config.bucketName;
    this.prefix = config.prefix || '';
    this.contentType = config.contentType || 'application/json';
    this.encryption = config.encryption ?? true;
  }

  /**
   * Store an object in S3
   */
  async store(key: string, data: any, metadata?: StorageMetadata): Promise<void> {
    const fullKey = this.prefix ? `${this.prefix}/${key}` : key;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fullKey,
      Body: typeof data === 'string' ? data : JSON.stringify(data),
      ContentType: this.contentType,
      Metadata: metadata,
      ...(this.encryption && {
        ServerSideEncryption: 'AES256',
      }),
    });

    await this.client.send(command);
  }

  /**
   * Retrieve an object from S3
   */
  async retrieve(key: string): Promise<StorageObject | null> {
    const fullKey = this.prefix ? `${this.prefix}/${key}` : key;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fullKey,
      });

      const response: GetObjectCommandOutput = await this.client.send(command);
      
      if (!response.Body) {
        return null;
      }

      // Convert stream to string
      const bodyString = await this.streamToString(response.Body as any);

      const result: StorageObject = {
        key,
        data: bodyString,
        metadata: response.Metadata || {},
      };
      
      if (response.ContentType) result.contentType = response.ContentType;
      if (response.ContentLength) result.size = response.ContentLength.toString();
      if (response.LastModified) result.lastModified = response.LastModified.toISOString();
      
      return result;
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete an object from S3
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.prefix ? `${this.prefix}/${key}` : key;

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: fullKey,
    });

    await this.client.send(command);
  }

  /**
   * Check if an object exists in S3
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.prefix ? `${this.prefix}/${key}` : key;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fullKey,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * List objects in S3 with optional prefix
   */
  async list(prefix?: string): Promise<string[]> {
    const fullPrefix = this.prefix 
      ? `${this.prefix}/${prefix || ''}` 
      : (prefix || '');

    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: fullPrefix,
    });

    const response = await this.client.send(command);
    
    return response.Contents?.map(obj => obj.Key || '').filter(Boolean) || [];
  }

  /**
   * Get metadata for an object
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    const fullKey = this.prefix ? `${this.prefix}/${key}` : key;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fullKey,
      });

      const response = await this.client.send(command);
      
      const result: StorageMetadata = {
        ...response.Metadata,
      };
      
      if (response.ContentType) result.contentType = response.ContentType;
      if (response.ContentLength) result.size = response.ContentLength.toString();
      if (response.LastModified) result.lastModified = response.LastModified.toISOString();
      if (response.ETag) result.etag = response.ETag;
      
      return result;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Helper method to convert stream to string
   */
  private async streamToString(stream: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }
} 