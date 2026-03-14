/**
 * NetworkStatusBanner Component
 * Shows network connectivity status with auto-dismiss
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { colors, spacing } from '../theme';

interface NetworkStatusBannerProps {
  autoDismiss?: boolean;
  dismissDelay?: number;
  showWhenOnline?: boolean;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({
  autoDismiss = true,
  dismissDelay = 3000,
  showWhenOnline = false,
}) => {
  const { t } = useTranslation();
  const { status } = useNetworkStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const wasOffline = useRef(false);

  useEffect(() => {
    if (status.isOffline) {
      // Going offline
      wasOffline.current = true;
      setIsVisible(true);
      setShowOnlineMessage(false);
      animateIn();
    } else if (wasOffline.current) {
      // Coming back online
      if (showWhenOnline) {
        setShowOnlineMessage(true);
        setIsVisible(true);
        animateIn();

        if (autoDismiss) {
          setTimeout(() => {
            animateOut(() => {
              setIsVisible(false);
              setShowOnlineMessage(false);
            });
          }, dismissDelay);
        }
      } else {
        animateOut(() => {
          setIsVisible(false);
        });
      }
      wasOffline.current = false;
    }
  }, [status.isOffline, autoDismiss, dismissDelay, showWhenOnline]);

  const animateIn = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  const animateOut = (callback?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: -60,
      duration: 200,
      useNativeDriver: true,
    }).start(callback);
  };

  const handleDismiss = () => {
    animateOut(() => {
      setIsVisible(false);
      setShowOnlineMessage(false);
    });
  };

  if (!isVisible && !status.isOffline) {
    return null;
  }

  const isOnlineState = showOnlineMessage && !status.isOffline;
  const backgroundColor = isOnlineState ? colors.success : colors.error;
  const iconName = isOnlineState ? 'wifi-check' : 'wifi-off';
  const message = isOnlineState
    ? t('network.backOnline', 'Back online')
    : t('network.offline', 'No internet connection');

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.content}>
        <IconButton
          icon={iconName}
          iconColor={colors.white}
          size={20}
          style={styles.icon}
        />
        <Text style={styles.text}>{message}</Text>
        {!status.isOffline && (
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
            <IconButton
              icon="close"
              iconColor={colors.white}
              size={16}
              style={styles.closeIcon}
            />
          </TouchableOpacity>
        )}
      </View>
      {status.isOffline && (
        <View style={styles.details}>
          <Text style={styles.detailsText}>
            {t('network.offlineHint', 'Some features may be limited')}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 48,
  },
  icon: {
    margin: 0,
  },
  text: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  dismissButton: {
    padding: spacing.xs,
  },
  closeIcon: {
    margin: 0,
  },
  details: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  detailsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
});

export default NetworkStatusBanner;
