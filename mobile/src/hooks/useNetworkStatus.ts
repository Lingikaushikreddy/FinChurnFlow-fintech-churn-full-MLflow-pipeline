/**
 * useNetworkStatus Hook
 * Monitor network connectivity with detailed status
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoStateType;
  isWifi: boolean;
  isCellular: boolean;
  isOffline: boolean;
  details: NetInfoState['details'];
}

interface UseNetworkStatusReturn {
  status: NetworkStatus;
  refresh: () => Promise<void>;
  onStatusChange: (callback: (status: NetworkStatus) => void) => () => void;
}

const parseNetInfoState = (state: NetInfoState): NetworkStatus => ({
  isConnected: state.isConnected ?? false,
  isInternetReachable: state.isInternetReachable,
  type: state.type,
  isWifi: state.type === 'wifi',
  isCellular: state.type === 'cellular',
  isOffline: !state.isConnected || state.isInternetReachable === false,
  details: state.details,
});

export const useNetworkStatus = (): UseNetworkStatusReturn => {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: 'unknown',
    isWifi: false,
    isCellular: false,
    isOffline: false,
    details: null,
  });

  const [callbacks, setCallbacks] = useState<Array<(status: NetworkStatus) => void>>([]);

  useEffect(() => {
    // Get initial status
    NetInfo.fetch().then((state) => {
      const newStatus = parseNetInfoState(state);
      setStatus(newStatus);
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const newStatus = parseNetInfoState(state);
      setStatus(newStatus);

      // Notify all callbacks
      callbacks.forEach((callback) => callback(newStatus));
    });

    return () => unsubscribe();
  }, [callbacks]);

  const refresh = useCallback(async () => {
    const state = await NetInfo.fetch();
    const newStatus = parseNetInfoState(state);
    setStatus(newStatus);
  }, []);

  const onStatusChange = useCallback(
    (callback: (status: NetworkStatus) => void) => {
      setCallbacks((prev) => [...prev, callback]);

      return () => {
        setCallbacks((prev) => prev.filter((cb) => cb !== callback));
      };
    },
    []
  );

  return {
    status,
    refresh,
    onStatusChange,
  };
};

export default useNetworkStatus;
