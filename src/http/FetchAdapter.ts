// Using native fetch (available in Node.js 18+)
// For older versions, you would need to install node-fetch
import {
  IHttpClientAdapter,
  AdapterHttpRequest,
  AdapterHttpResponse,
} from 'syntropylog/http';

export class FetchAdapter implements IHttpClientAdapter {
  async request<T>(
    request: AdapterHttpRequest,
  ): Promise<AdapterHttpResponse<T>> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers as Record<string, string>,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    // Handle cases where the response body might be empty
    const text = await response.text();
    const data = (text ? JSON.parse(text) : {}) as T;

    return {
      statusCode: response.status,
      data: data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }
} 