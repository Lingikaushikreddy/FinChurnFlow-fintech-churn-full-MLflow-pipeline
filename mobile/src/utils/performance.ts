/**
 * Performance Utilities
 * Optimization helpers, caching, and performance monitoring
 */

import { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoize function results with optional TTL
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T,
  options: {
    maxSize?: number;
    ttl?: number;
    keyResolver?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const { maxSize = 100, ttl, keyResolver } = options;
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  return ((...args: Parameters<T>) => {
    const key = keyResolver
      ? keyResolver(...args)
      : JSON.stringify(args);

    const cached = cache.get(key);

    if (cached) {
      if (!ttl || Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }
      cache.delete(key);
    }

    const result = func(...args);

    // Enforce max cache size (LRU-like behavior)
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, { value: result as ReturnType<T>, timestamp: Date.now() });

    return result;
  }) as T;
}

/**
 * Hook for debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debounced callback
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    debounce((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay),
    [delay]
  );
}

/**
 * Hook for throttled callback
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    throttle((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, limit),
    [limit]
  );
}

/**
 * Hook to run heavy tasks after interactions
 */
export function useAfterInteractions(callback: () => void, deps: unknown[] = []): void {
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      callback();
    });

    return () => task.cancel();
  }, deps);
}

/**
 * Hook for lazy initialization
 */
export function useLazyInit<T>(initializer: () => T): T {
  const ref = useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = initializer();
  }

  return ref.current;
}

/**
 * Hook for previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook for stable callback reference
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }) as T, []);
}

/**
 * Simple in-memory cache with TTL
 */
export class Cache<T> {
  private cache: Map<string, { value: T; expiry: number }> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);

    if (!item) return undefined;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Request deduplication - prevents duplicate concurrent requests
 */
export class RequestDeduplicator {
  private pending: Map<string, Promise<unknown>> = new Map();

  async dedupe<T>(key: string, request: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = request().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pending.clear();
  }
}

/**
 * Batch async operations
 */
export async function batchAsync<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize = 5
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number = 0;
  private marks: Map<string, number> = new Map();

  start(): void {
    this.startTime = performance.now();
    this.marks.clear();
  }

  mark(name: string): void {
    this.marks.set(name, performance.now() - this.startTime);
  }

  getElapsed(): number {
    return performance.now() - this.startTime;
  }

  getMarks(): Record<string, number> {
    const result: Record<string, number> = {};
    this.marks.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  log(label = 'Performance'): void {
    console.log(`[${label}] Total: ${this.getElapsed().toFixed(2)}ms`);
    this.marks.forEach((time, name) => {
      console.log(`  - ${name}: ${time.toFixed(2)}ms`);
    });
  }
}

/**
 * Chunk array for pagination/virtualization
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Create a cancelable promise
 */
export function makeCancelable<T>(promise: Promise<T>): {
  promise: Promise<T>;
  cancel: () => void;
} {
  let isCanceled = false;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise
      .then((value) => {
        if (!isCanceled) {
          resolve(value);
        }
      })
      .catch((error) => {
        if (!isCanceled) {
          reject(error);
        }
      });
  });

  return {
    promise: wrappedPromise,
    cancel: () => {
      isCanceled = true;
    },
  };
}

// Export singleton instances
export const apiCache = new Cache();
export const requestDeduplicator = new RequestDeduplicator();

export default {
  debounce,
  throttle,
  memoize,
  useDebouncedValue,
  useDebouncedCallback,
  useThrottledCallback,
  useAfterInteractions,
  useLazyInit,
  usePrevious,
  useStableCallback,
  Cache,
  RequestDeduplicator,
  batchAsync,
  retryWithBackoff,
  PerformanceTimer,
  chunk,
  makeCancelable,
  apiCache,
  requestDeduplicator,
};
