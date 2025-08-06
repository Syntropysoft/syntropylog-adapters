/**
 * @file src/aws/CloudWatchAdapter.ts
 * @description An implementation of the ILogger adapter for AWS CloudWatch Logs.
 * This adapter allows SyntropyLog to send logs directly to CloudWatch Logs.
 */

import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
  CreateLogGroupCommand,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { ILogger, LogMetadata, LogFormatArg, JsonValue, LogBindings, LogRetentionRules } from '@syntropylog/types';

// Define LogLevel locally since it's not exported from @syntropylog/types
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export interface CloudWatchAdapterConfig {
  /** AWS CloudWatch Logs client instance */
  client: CloudWatchLogsClient;
  /** CloudWatch Log Group name */
  logGroupName: string;
  /** CloudWatch Log Stream name (optional, will use timestamp if not provided) */
  logStreamName?: string;
  /** AWS region */
  region?: string;
  /** Whether to create log group/stream if they don't exist */
  autoCreate?: boolean;
}

/**
 * @class CloudWatchAdapter
 * @description An adapter that allows SyntropyLog to send logs to AWS CloudWatch Logs.
 * It implements the ILogger interface and translates log calls to CloudWatch Logs API.
 * @implements {ILogger}
 */
export class CloudWatchAdapter implements ILogger {
  private readonly client: CloudWatchLogsClient;
  private readonly logGroupName: string;
  private readonly logStreamName: string;
  private readonly autoCreate: boolean;
  private sequenceToken?: string;
  public level: LogLevel = 'info';

  constructor(config: CloudWatchAdapterConfig) {
    this.client = config.client;
    this.logGroupName = config.logGroupName;
    this.logStreamName = config.logStreamName || new Date().toISOString().split('T')[0];
    this.autoCreate = config.autoCreate ?? true;
  }

  /**
   * Initialize the adapter by creating log group and stream if needed
   */
  async initialize(): Promise<void> {
    if (this.autoCreate) {
      await this.ensureLogGroupExists();
      await this.ensureLogStreamExists();
    }
  }

  /**
   * Log a message to CloudWatch Logs
   */
  async log(level: LogLevel, message: string, context?: LogMetadata): Promise<void> {
    const logEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        ...context,
      }),
    };

    try {
      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [logEvent],
        sequenceToken: this.sequenceToken,
      });

      const response = await this.client.send(command);
      this.sequenceToken = response.nextSequenceToken;
    } catch (error: any) {
      // Handle sequence token errors
      if (error.name === 'InvalidSequenceTokenException') {
        this.sequenceToken = error.message.match(/sequenceToken is: (.+)/)?.[1];
        // Retry once with the correct sequence token
        if (this.sequenceToken) {
          const retryCommand = new PutLogEventsCommand({
            logGroupName: this.logGroupName,
            logStreamName: this.logStreamName,
            logEvents: [logEvent],
            sequenceToken: this.sequenceToken,
          });
          const retryResponse = await this.client.send(retryCommand);
          this.sequenceToken = retryResponse.nextSequenceToken;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Convenience methods for different log levels
   */
  async trace(...args: (LogFormatArg | LogMetadata | JsonValue)[]): Promise<void> {
    const message = typeof args[0] === 'string' ? args[0] : 'Trace message';
    const context = args[1] as LogMetadata;
    await this.log('trace', message, context);
  }

  async debug(...args: (LogFormatArg | LogMetadata | JsonValue)[]): Promise<void> {
    const message = typeof args[0] === 'string' ? args[0] : 'Debug message';
    const context = args[1] as LogMetadata;
    await this.log('debug', message, context);
  }

  async info(...args: (LogFormatArg | LogMetadata | JsonValue)[]): Promise<void> {
    const message = typeof args[0] === 'string' ? args[0] : 'Info message';
    const context = args[1] as LogMetadata;
    await this.log('info', message, context);
  }

  async warn(...args: (LogFormatArg | LogMetadata | JsonValue)[]): Promise<void> {
    const message = typeof args[0] === 'string' ? args[0] : 'Warn message';
    const context = args[1] as LogMetadata;
    await this.log('warn', message, context);
  }

  async error(...args: (LogFormatArg | LogMetadata | JsonValue)[]): Promise<void> {
    const message = typeof args[0] === 'string' ? args[0] : 'Error message';
    const context = args[1] as LogMetadata;
    await this.log('error', message, context);
  }

  async fatal(...args: (LogFormatArg | LogMetadata | JsonValue)[]): Promise<void> {
    const message = typeof args[0] === 'string' ? args[0] : 'Fatal message';
    const context = args[1] as LogMetadata;
    await this.log('fatal', message, context);
  }

  // Implement required ILogger methods
  child(bindings: LogBindings): ILogger {
    // Create a new instance with additional bindings
    const childAdapter = new CloudWatchAdapter({
      client: this.client,
      logGroupName: this.logGroupName,
      logStreamName: this.logStreamName,
      autoCreate: this.autoCreate,
    });
    // Note: In a real implementation, you'd merge bindings
    return childAdapter;
  }

  setLevel(level: LogLevel): void {
    // CloudWatch doesn't have log levels, so we just store it
    this.level = level;
  }

  withSource(source: string): ILogger {
    const childAdapter = new CloudWatchAdapter({
      client: this.client,
      logGroupName: this.logGroupName,
      logStreamName: this.logStreamName,
      autoCreate: this.autoCreate,
    });
    // Note: In a real implementation, you'd add source to context
    return childAdapter;
  }

  withRetention(rules: LogRetentionRules): ILogger {
    const childAdapter = new CloudWatchAdapter({
      client: this.client,
      logGroupName: this.logGroupName,
      logStreamName: this.logStreamName,
      autoCreate: this.autoCreate,
    });
    // Note: In a real implementation, you'd apply retention rules
    return childAdapter;
  }

  withTransactionId(transactionId: string): ILogger {
    const childAdapter = new CloudWatchAdapter({
      client: this.client,
      logGroupName: this.logGroupName,
      logStreamName: this.logStreamName,
      autoCreate: this.autoCreate,
    });
    // Note: In a real implementation, you'd add transactionId to context
    return childAdapter;
  }

  /**
   * Ensure the log group exists, create it if it doesn't
   */
  private async ensureLogGroupExists(): Promise<void> {
    try {
      const describeCommand = new DescribeLogGroupsCommand({
        logGroupNamePrefix: this.logGroupName,
      });
      const response = await this.client.send(describeCommand);
      
      const logGroupExists = response.logGroups?.some(
        group => group.logGroupName === this.logGroupName
      );

      if (!logGroupExists) {
        const createCommand = new CreateLogGroupCommand({
          logGroupName: this.logGroupName,
        });
        await this.client.send(createCommand);
      }
    } catch (error) {
      // Log group might already exist or we don't have permissions
      console.warn(`Could not ensure log group exists: ${error}`);
    }
  }

  /**
   * Ensure the log stream exists, create it if it doesn't
   */
  private async ensureLogStreamExists(): Promise<void> {
    try {
      const describeCommand = new DescribeLogStreamsCommand({
        logGroupName: this.logGroupName,
        logStreamNamePrefix: this.logStreamName,
      });
      const response = await this.client.send(describeCommand);
      
      const logStreamExists = response.logStreams?.some(
        stream => stream.logStreamName === this.logStreamName
      );

      if (!logStreamExists) {
        const createCommand = new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
        });
        await this.client.send(createCommand);
      }
    } catch (error) {
      // Log stream might already exist or we don't have permissions
      console.warn(`Could not ensure log stream exists: ${error}`);
    }
  }
} 