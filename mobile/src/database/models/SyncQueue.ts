/**
 * SyncQueue Model - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncQueue {
  id: string;
  tableName: string;
  recordId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  retryCount: number;
  lastError: string | null;
  createdAt: Date;
}

// Helper functions that were getters on the class
export const hasExceededRetries = (item: SyncQueue): boolean => {
  return item.retryCount >= 3;
};

export const canRetry = (item: SyncQueue): boolean => {
  return item.retryCount < 3;
};

export const isCreateOperation = (operation: SyncOperation): boolean => {
  return operation === 'create';
};

export const isUpdateOperation = (operation: SyncOperation): boolean => {
  return operation === 'update';
};

export const isDeleteOperation = (operation: SyncOperation): boolean => {
  return operation === 'delete';
};

export const getPriority = (operation: SyncOperation): number => {
  // Delete > Create > Update
  switch (operation) {
    case 'delete':
      return 3;
    case 'create':
      return 2;
    case 'update':
      return 1;
    default:
      return 0;
  }
};

export default SyncQueue;
