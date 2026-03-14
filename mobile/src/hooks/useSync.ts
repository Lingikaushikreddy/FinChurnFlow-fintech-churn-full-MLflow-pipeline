/**
 * useSync Hook - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

import { useState, useEffect, useCallback } from 'react';
import { syncService, SyncStatus } from '../database/sync';

interface UseSyncReturn {
  status: SyncStatus;
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastError: Error | null;
  progress: { current: number; total: number };
  sync: () => Promise<boolean>;
  refresh: () => void;
}

export const useSync = (): UseSyncReturn => {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const refreshPendingCount = useCallback(async () => {
    // Mock: always return 0 pending items
    setPendingCount(0);
  }, []);

  useEffect(() => {
    // Set up sync callbacks
    syncService.setCallbacks({
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'idle') {
          refreshPendingCount();
        }
      },
      onProgress: (current, total) => {
        setProgress({ current, total });
      },
      onError: (error) => {
        setLastError(error);
      },
      onComplete: () => {
        setLastError(null);
        refreshPendingCount();
      },
    });

    // Initial pending count
    refreshPendingCount();

    return () => {
      syncService.setCallbacks({});
    };
  }, [refreshPendingCount]);

  const sync = useCallback(async () => {
    setLastError(null);
    return syncService.sync();
  }, []);

  return {
    status,
    pendingCount,
    isOnline: status !== 'offline',
    isSyncing: status === 'syncing',
    lastError,
    progress,
    sync,
    refresh: refreshPendingCount,
  };
};

export default useSync;
