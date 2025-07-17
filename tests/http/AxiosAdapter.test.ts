import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AxiosAdapter } from '../../src/http/AxiosAdapter';

describe('AxiosAdapter', () => {
  let adapter: AxiosAdapter;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      request: vi.fn()
    };
    adapter = new AxiosAdapter(mockAxios);
  });

  describe('request', () => {
    it('should make successful request', async () => {
      const mockResponse = {
        status: 200,
        data: { message: 'success' },
        headers: { 'content-type': 'application/json' }
      };

      mockAxios.request.mockResolvedValue(mockResponse);

      const request = {
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' },
        body: null,
        queryParams: { page: 1 }
      };

      const result = await adapter.request(request);

      expect(mockAxios.request).toHaveBeenCalledWith({
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' },
        data: null, // El adapter siempre incluye data
        params: { page: 1 }
      });

      expect(result).toEqual({
        statusCode: 200,
        data: { message: 'success' },
        headers: { 'content-type': 'application/json' }
      });
    });

    it('should handle POST request with body', async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1, name: 'John' },
        headers: { 'content-type': 'application/json' }
      };

      mockAxios.request.mockResolvedValue(mockResponse);

      const request = {
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'John', email: 'john@example.com' },
        queryParams: {}
      };

      const result = await adapter.request(request);

      expect(mockAxios.request).toHaveBeenCalledWith({
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { name: 'John', email: 'john@example.com' },
        params: {}
      });

      expect(result.statusCode).toBe(201);
      expect(result.data).toEqual({ id: 1, name: 'John' });
    });

    it('should handle HTTP errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { error: 'Not found' },
          headers: { 'content-type': 'application/json' }
        },
        message: 'Request failed with status code 404'
      };

      mockAxios.request.mockRejectedValue(mockError);

      const request = {
        url: 'https://api.example.com/users/999',
        method: 'GET',
        headers: {},
        body: null,
        queryParams: {}
      };

      await expect(adapter.request(request)).rejects.toThrow('Request failed with status code 404');
    });

    it('should handle network errors', async () => {
      const mockError = {
        message: 'Network Error',
        code: 'NETWORK_ERROR'
      };

      mockAxios.request.mockRejectedValue(mockError);

      const request = {
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {},
        body: null,
        queryParams: {}
      };

      await expect(adapter.request(request)).rejects.toThrow('Network Error');
    });

    it('should handle request without query params', async () => {
      const mockResponse = {
        status: 200,
        data: { message: 'success' },
        headers: {}
      };

      mockAxios.request.mockResolvedValue(mockResponse);

      const request = {
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {},
        body: null,
        queryParams: undefined
      };

      const result = await adapter.request(request);

      expect(mockAxios.request).toHaveBeenCalledWith({
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {},
        data: null,
        params: undefined
      });

      expect(result.statusCode).toBe(200);
    });

    it('should handle request without headers', async () => {
      const mockResponse = {
        status: 200,
        data: { message: 'success' },
        headers: {}
      };

      mockAxios.request.mockResolvedValue(mockResponse);

      const request = {
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: undefined,
        body: null,
        queryParams: {}
      };

      const result = await adapter.request(request);

      expect(mockAxios.request).toHaveBeenCalledWith({
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {}, // El adapter convierte undefined a {}
        data: null,
        params: {}
      });

      expect(result.statusCode).toBe(200);
    });
  });
}); 