/**
 * Robust API Client with interceptors, retry logic, and error handling
 */

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// Configuration
const API_BASE_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1'
  : 'https://api.razorpaynano.com/api/v1';

const TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
const RETRYABLE_ERROR_CODES = ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'];

// Custom error types
export class ApiError extends Error {
  code: string;
  status?: number;
  data?: unknown;
  isRetryable: boolean;
  isNetworkError: boolean;

  constructor(
    message: string,
    code: string,
    status?: number,
    data?: unknown,
    isRetryable = false,
    isNetworkError = false
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
    this.isRetryable = isRetryable;
    this.isNetworkError = isNetworkError;
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'No internet connection') {
    super(message, 'NETWORK_ERROR', undefined, undefined, true, true);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401, undefined, false, false);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ApiError {
  errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 422, errors, false, false);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// Request queue for offline support
interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  resolve: (value: AxiosResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;

  add(config: AxiosRequestConfig): Promise<AxiosResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: Date.now().toString(),
        config,
        resolve,
        reject,
        timestamp: Date.now(),
      });
    });
  }

  async process(client: AxiosInstance): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) continue;

      // Skip stale requests (older than 5 minutes)
      if (Date.now() - request.timestamp > 5 * 60 * 1000) {
        request.reject(new ApiError('Request expired', 'REQUEST_EXPIRED'));
        continue;
      }

      try {
        const response = await client.request(request.config);
        request.resolve(response);
      } catch (error) {
        request.reject(error as Error);
      }
    }

    this.isProcessing = false;
  }

  clear(): void {
    this.queue.forEach((request) => {
      request.reject(new ApiError('Queue cleared', 'QUEUE_CLEARED'));
    });
    this.queue = [];
  }

  get length(): number {
    return this.queue.length;
  }
}

// Create API client factory
class ApiClientFactory {
  private client: AxiosInstance;
  private requestQueue: RequestQueue;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private isOnline = true;

  constructor() {
    this.client = this.createClient();
    this.requestQueue = new RequestQueue();
    this.setupNetworkListener();
  }

  private createClient(): AxiosInstance {
    const client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Platform': Platform.OS,
        'X-App-Version': '1.0.0',
      },
    });

    // Request interceptor
    client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Check network connectivity
        if (!this.isOnline) {
          throw new NetworkError();
        }

        // Add auth token
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        return this.handleError(error);
      }
    );

    return client;
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Process queued requests when coming back online
      if (wasOffline && this.isOnline) {
        this.requestQueue.process(this.client);
      }
    });
  }

  private async handleError(error: AxiosError): Promise<never> {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: number };

    // Network error
    if (!error.response) {
      const errorCode = (error as AxiosError).code;
      if (errorCode && RETRYABLE_ERROR_CODES.includes(errorCode)) {
        throw new NetworkError(error.message);
      }
      throw new ApiError(
        error.message || 'Network error',
        errorCode || 'UNKNOWN_ERROR',
        undefined,
        undefined,
        true,
        true
      );
    }

    const { status, data } = error.response;

    // Handle 401 - Token expired
    if (status === 401 && originalRequest) {
      return this.handleTokenRefresh(originalRequest);
    }

    // Handle 422 - Validation error
    if (status === 422 && data) {
      const validationData = data as { message?: string; errors?: Record<string, string[]> };
      throw new ValidationError(
        validationData.message || 'Validation failed',
        validationData.errors || {}
      );
    }

    // Handle retryable errors
    if (RETRYABLE_STATUS_CODES.includes(status)) {
      const retryCount = originalRequest._retry || 0;

      if (retryCount < MAX_RETRIES) {
        originalRequest._retry = retryCount + 1;
        const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.client.request(originalRequest);
      }
    }

    // Create appropriate error
    const responseData = data as { message?: string; code?: string };
    throw new ApiError(
      responseData?.message || error.message || 'Request failed',
      responseData?.code || `HTTP_${status}`,
      status,
      data,
      RETRYABLE_STATUS_CODES.includes(status),
      false
    );
  }

  private async handleTokenRefresh(
    originalRequest: InternalAxiosRequestConfig
  ): Promise<AxiosResponse> {
    if (this.isRefreshing) {
      // Wait for token refresh
      return new Promise((resolve, reject) => {
        this.refreshSubscribers.push(async (token: string) => {
          try {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(await this.client.request(originalRequest));
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        throw new AuthenticationError('No refresh token available');
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token: newRefreshToken } = response.data;

      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      if (newRefreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      }

      // Notify subscribers
      this.refreshSubscribers.forEach((callback) => callback(access_token));
      this.refreshSubscribers = [];

      // Retry original request
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return this.client.request(originalRequest);
    } catch (refreshError) {
      // Clear tokens and reject all subscribers
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
      this.refreshSubscribers.forEach((callback) => {
        // Subscribers will reject with auth error
      });
      this.refreshSubscribers = [];

      throw new AuthenticationError('Session expired. Please login again.');
    } finally {
      this.isRefreshing = false;
    }
  }

  // Public methods
  get instance(): AxiosInstance {
    return this.client;
  }

  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  // Queue a request for later (offline support)
  queueRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.requestQueue.add(config);
  }

  // Get queued request count
  getQueuedCount(): number {
    return this.requestQueue.length;
  }

  // Clear request queue
  clearQueue(): void {
    this.requestQueue.clear();
  }

  // Set auth tokens
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  // Clear auth tokens
  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return !!token;
  }
}

// Export singleton instance
export const apiClient = new ApiClientFactory();
export default apiClient;
