/**
 * @file src/http/RequestAdapter.ts
 * @description Request adapter for SyntropyLog - The "Living Dinosaur" 🦕
 * 
 * This adapter demonstrates SyntropyLog's versatility by supporting
 * the deprecated 'request' library. It shows how the framework can
 * adapt to any HTTP client, even legacy ones!
 */

import request from 'request';
import { 
  IHttpClientAdapter, 
  AdapterHttpRequest, 
  AdapterHttpResponse, 
  AdapterHttpError 
} from '@syntropylog/types';

/**
 * Adapter for the deprecated 'request' library
 * 
 * This is our "living dinosaur" - a demonstration of how SyntropyLog
 * can work with any HTTP client, even deprecated ones like 'request'.
 * 
 * 🦕 Fun fact: The 'request' library was deprecated in 2020, but
 * SyntropyLog can still instrument it perfectly!
 */
export class RequestAdapter implements IHttpClientAdapter {
  private requestInstance: typeof request;

  constructor(requestInstance: typeof request = request) {
    this.requestInstance = requestInstance;
  }

  async request<T>(requestConfig: AdapterHttpRequest): Promise<AdapterHttpResponse<T>> {
    return new Promise((resolve, reject) => {
      // Convert our normalized request to request library format
      const requestOptions: request.OptionsWithUrl = {
        url: requestConfig.url,
        method: requestConfig.method,
        headers: requestConfig.headers as Record<string, string>,
        body: requestConfig.body,
        qs: requestConfig.queryParams,
        json: typeof requestConfig.body === 'object' && requestConfig.body !== null,
        timeout: 5000, // Default timeout
      };

      // Make the request using the legacy library
      this.requestInstance(requestOptions, (error, response, body) => {
        if (error) {
          // Create a normalized error
          const adapterError = new Error(`Request failed: ${error.message}`) as AdapterHttpError;
          adapterError.request = requestConfig;
          adapterError.isAdapterError = true;
          reject(adapterError);
          return;
        }

        if (!response) {
          const adapterError = new Error('No response received') as AdapterHttpError;
          adapterError.request = requestConfig;
          adapterError.isAdapterError = true;
          reject(adapterError);
          return;
        }

        // Parse the response body
        let data: T;
        try {
          if (typeof body === 'string') {
            data = JSON.parse(body) as T;
          } else {
            data = body as T;
          }
        } catch (parseError) {
          data = body as T;
        }

        // Create normalized response
        const adapterResponse: AdapterHttpResponse<T> = {
          statusCode: response.statusCode || 0,
          data,
          headers: response.headers as Record<string, string | number | string[]>,
        };

        resolve(adapterResponse);
      });
    });
  }
} 