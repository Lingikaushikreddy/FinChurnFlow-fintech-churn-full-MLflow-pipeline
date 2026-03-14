/**
 * useNotifications Hook - Push notification handling (Mock version for development)
 * TODO: Install @react-native-firebase/messaging and @notifee/react-native for production
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = '@fcm_token';

export interface NotificationPayload {
  id: string;
  type: 'payment' | 'payout' | 'order' | 'salary' | 'alert' | 'promo';
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface UseNotificationsReturn {
  isPermissionGranted: boolean;
  fcmToken: string | null;
  lastNotification: NotificationPayload | null;
  requestPermission: () => Promise<boolean>;
  onNotificationReceived: (callback: (notification: NotificationPayload) => void) => () => void;
  onNotificationOpened: (callback: (notification: NotificationPayload) => void) => () => void;
  displayLocalNotification: (notification: NotificationPayload) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<NotificationPayload | null>(null);

  const onReceivedCallbackRef = useRef<((notification: NotificationPayload) => void) | null>(null);
  const onOpenedCallbackRef = useRef<((notification: NotificationPayload) => void) | null>(null);

  // Mock request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    console.log('[Notifications] Mock: Permission requested');
    setIsPermissionGranted(true);

    // Generate mock token
    const mockToken = `mock_fcm_token_${Platform.OS}_${Date.now()}`;
    setFcmToken(mockToken);
    await AsyncStorage.setItem(FCM_TOKEN_KEY, mockToken);

    return true;
  }, []);

  // Mock display local notification
  const displayLocalNotification = useCallback(
    async (notification: NotificationPayload) => {
      console.log('[Notifications] Mock: Display notification', notification);
      setLastNotification(notification);
      onReceivedCallbackRef.current?.(notification);
    },
    []
  );

  // Mock clear all notifications
  const clearAllNotifications = useCallback(async () => {
    console.log('[Notifications] Mock: Clear all notifications');
    setLastNotification(null);
  }, []);

  // Set up notification received callback
  const onNotificationReceived = useCallback(
    (callback: (notification: NotificationPayload) => void) => {
      onReceivedCallbackRef.current = callback;
      return () => {
        onReceivedCallbackRef.current = null;
      };
    },
    []
  );

  // Set up notification opened callback
  const onNotificationOpened = useCallback(
    (callback: (notification: NotificationPayload) => void) => {
      onOpenedCallbackRef.current = callback;
      return () => {
        onOpenedCallbackRef.current = null;
      };
    },
    []
  );

  // Initialize
  useEffect(() => {
    // Load saved token
    AsyncStorage.getItem(FCM_TOKEN_KEY).then((token) => {
      if (token) {
        setFcmToken(token);
        setIsPermissionGranted(true);
      }
    });
  }, []);

  return {
    isPermissionGranted,
    fcmToken,
    lastNotification,
    requestPermission,
    onNotificationReceived,
    onNotificationOpened,
    displayLocalNotification,
    clearAllNotifications,
  };
};

export default useNotifications;
