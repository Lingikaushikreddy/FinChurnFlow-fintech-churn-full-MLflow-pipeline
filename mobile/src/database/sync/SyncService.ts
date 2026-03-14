/**
 * SyncService - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncCallbacks {
  onStatusChange?: (status: SyncStatus) => void;
  onProgress?: (current: number, total: number) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

class SyncService {
  private static instance: SyncService;
  private isOnline = true;
  private isSyncing = false;
  private callbacks: SyncCallbacks = {};
  private unsubscribeNetInfo: (() => void) | null = null;

  private constructor() {
    this.setupNetworkListener();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private setupNetworkListener() {
    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Auto-sync when coming back online
      if (wasOffline && this.isOnline) {
        this.sync();
      }

      if (!this.isOnline) {
        this.callbacks.onStatusChange?.('offline');
      }
    });
  }

  setCallbacks(callbacks: SyncCallbacks) {
    this.callbacks = callbacks;
  }

  async sync(): Promise<boolean> {
    if (this.isSyncing) {
      console.log('[SyncService] Mock: Sync already in progress');
      return false;
    }

    if (!this.isOnline) {
      this.callbacks.onStatusChange?.('offline');
      return false;
    }

    this.isSyncing = true;
    this.callbacks.onStatusChange?.('syncing');

    try {
      // Mock sync - just pretend to sync
      console.log('[SyncService] Mock: Starting sync...');

      // Simulate sync progress
      this.callbacks.onProgress?.(0, 1);
      await new Promise(resolve => setTimeout(resolve, 500));
      this.callbacks.onProgress?.(1, 1);

      console.log('[SyncService] Mock: Sync complete');
      this.callbacks.onStatusChange?.('idle');
      this.callbacks.onComplete?.();
      return true;
    } catch (error) {
      console.error('[SyncService] Mock: Sync error:', error);
      this.callbacks.onStatusChange?.('error');
      this.callbacks.onError?.(error as Error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  // Queue a sync operation (mock - just logs)
  async queueSync(
    tableName: string,
    recordId: string,
    operation: 'create' | 'update' | 'delete',
    payload: Record<string, unknown>
  ): Promise<void> {
    console.log('[SyncService] Mock: Queued sync', { tableName, recordId, operation });

    // Try to sync immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.sync();
    }
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  destroy() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
  }
}

export const syncService = SyncService.getInstance();
export { SyncService };
export default syncService;
