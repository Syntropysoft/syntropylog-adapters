import type { IncomingHttpHeaders } from 'http';
import {
  IHttpClientAdapter,
  AdapterHttpRequest,
  AdapterHttpResponse,
  AdapterHttpError,
} from 'syntropylog/http';

function normalizeGotHeaders(
  headers: IncomingHttpHeaders,
): Record<string, string | number | string[]> {
  const normalized: Record<string, string | number | string[]> = {};
  for (const key in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, key)) {
      const value = headers[key];
      if (value !== undefined) {
        normalized[key] = value;
      }
    }
  }
  return normalized;
}
export class GotAdapter implements IHttpClientAdapter {
  private readonly gotInstance: any;
  constructor(instance: any) {
    this.gotInstance = instance;
  }
  async request<T>(
    request: AdapterHttpRequest,
  ): Promise<AdapterHttpResponse<T>> {
    try {
      const response = await this.gotInstance(request.url, {
        method: request.method,
        headers: request.headers as Record<string, string>,
        json: request.body,
        searchParams: request.queryParams,
        throwHttpErrors: false,
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(
          response.statusMessage || 'HTTP Error'
        );
      }
      return {
        statusCode: response.statusCode,
        data: response.body,
        headers: normalizeGotHeaders(response.headers),
      };
    } catch (error: any) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'RequestError') {
        const normalizedError: AdapterHttpError = {
          name: 'AdapterHttpError',
          message: error.message || 'Unknown error',
          stack: error.stack,
          isAdapterError: true,
          request: request,
          response: error.response
            ? {
                statusCode: error.response.statusCode,
                data: error.response.body,
                headers: normalizeGotHeaders(error.response.headers),
              }
            : undefined,
        };
        throw normalizedError;
      }
      throw error;
    }
  }
} 