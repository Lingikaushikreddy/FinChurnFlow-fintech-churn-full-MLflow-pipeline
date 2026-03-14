/**
 * Database Module - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

// Mock database for development
export const database = {
  get: () => null,
  write: async <T>(callback: () => Promise<T>): Promise<T> => {
    return callback();
  },
  read: async <T>(callback: () => Promise<T>): Promise<T> => {
    return callback();
  },
};

export const getDatabase = () => database;

// Mock collections (empty arrays)
export const transactionsCollection = {
  query: () => ({ fetch: async () => [] }),
  find: async () => null,
  create: async () => null,
};

export const productsCollection = {
  query: () => ({ fetch: async () => [] }),
  find: async () => null,
  create: async () => null,
};

export const contactsCollection = {
  query: () => ({ fetch: async () => [] }),
  find: async () => null,
  create: async () => null,
};

export const employeesCollection = {
  query: () => ({ fetch: async () => [] }),
  find: async () => null,
  create: async () => null,
};

export const ordersCollection = {
  query: () => ({ fetch: async () => [] }),
  find: async () => null,
  create: async () => null,
};

export const categoriesCollection = {
  query: () => ({ fetch: async () => [] }),
  find: async () => null,
  create: async () => null,
};

export const syncQueueCollection = {
  query: () => ({ fetch: async () => [] }),
  find: async () => null,
  create: async () => null,
};

// Mock helper functions
export const getPendingSyncCount = async (): Promise<number> => {
  return 0;
};

export const clearAllData = async (): Promise<void> => {
  console.log('[Database] Mock: Clear all data');
};

// Re-export types
export type { Transaction, TransactionType, TransactionStatus } from './models/Transaction';
export type { Product } from './models/Product';
export type { Contact } from './models/Contact';
export type { Employee } from './models/Employee';
export type { Order, OrderStatus, OrderItem } from './models/Order';
export type { Category } from './models/Category';
export type { SyncQueue, SyncOperation } from './models/SyncQueue';

export default database;
