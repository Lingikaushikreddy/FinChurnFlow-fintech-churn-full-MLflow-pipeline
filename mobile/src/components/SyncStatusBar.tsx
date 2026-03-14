/**
 * SyncStatusBar Component
 * Displays offline status and sync progress
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Text, IconButton, ProgressBar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSync } from '../hooks';
import { colors, spacing } from '../theme';

interface SyncStatusBarProps {
  showWhenOnline?: boolean;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  showWhenOnline = false,
}) => {
  const { t } = useTranslation();
  const { status, pendingCount, isSyncing, progress, sync } = useSync();
  const slideAnim = useRef(new Animated.Value(-60)).current;

  const shouldShow = status === 'offline' || status === 'error' || isSyncing ||
    (showWhenOnline && pendingCount > 0);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: shouldShow ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, slideAnim]);

  const getStatusConfig = () => {
    switch (status) {
      case 'offline':
        return {
          icon: 'wifi-off',
          text: t('sync.offline'),
          color: colors.warning,
          bgColor: colors.warningLight,
        };
      case 'syncing':
        return {
          icon: 'sync',
          text: progress.total > 0
            ? t('sync.syncing_progress', { current: progress.current, total: progress.total })
            : t('sync.syncing'),
          color: colors.info,
          bgColor: colors.infoLight,
        };
      case 'error':
        return {
          icon: 'alert-circle',
          text: t('sync.error'),
          color: colors.error,
          bgColor: colors.errorLight,
        };
      default:
        if (pendingCount > 0) {
          return {
            icon: 'cloud-upload',
            text: t('sync.pending', { count: pendingCount }),
            color: colors.info,
            bgColor: colors.infoLight,
          };
        }
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.bgColor, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.content}>
        <IconButton
          icon={config.icon}
          iconColor={config.color}
          size={20}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
          {isSyncing && progress.total > 0 && (
            <ProgressBar
              progress={progress.current / progress.total}
              color={config.color}
              style={styles.progressBar}
            />
          )}
        </View>
        {status === 'offline' && pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
        {(status === 'error' || (status === 'idle' && pendingCount > 0)) && (
          <TouchableOpacity onPress={sync} style={styles.retryButton}>
            <Text style={[styles.retryText, { color: config.color }]}>
              {t('sync.retry')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 48,
  },
  icon: {
    margin: 0,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    marginTop: spacing.xs,
    height: 3,
    borderRadius: 2,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  retryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SyncStatusBar;
