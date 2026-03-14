/**
 * StreakCounter Component
 * Displays daily usage streak for gamification
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { colors, spacing, shadows } from '../theme';

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: Date;
  compact?: boolean;
}

export const StreakCounter: React.FC<StreakCounterProps> = ({
  currentStreak,
  longestStreak,
  lastActiveDate,
  compact = false,
}) => {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const flameAnim = useRef(new Animated.Value(0)).current;

  const isActiveToday = lastActiveDate
    ? new Date().toDateString() === new Date(lastActiveDate).toDateString()
    : false;

  useEffect(() => {
    // Flame animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(flameAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [flameAnim]);

  useEffect(() => {
    // Pulse on streak update
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStreak, scaleAnim]);

  const getStreakColor = () => {
    if (currentStreak >= 30) return colors.warning;
    if (currentStreak >= 7) return colors.primary;
    return colors.gray500;
  };

  const getStreakEmoji = () => {
    if (currentStreak >= 100) return '🌟';
    if (currentStreak >= 30) return '🔥';
    if (currentStreak >= 7) return '⚡';
    if (currentStreak >= 3) return '✨';
    return '💪';
  };

  const flameScale = flameAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Animated.Text
          style={[styles.compactEmoji, { transform: [{ scale: flameScale }] }]}
        >
          {getStreakEmoji()}
        </Animated.Text>
        <Text style={[styles.compactCount, { color: getStreakColor() }]}>
          {currentStreak}
        </Text>
      </View>
    );
  }

  return (
    <Surface style={[styles.container, shadows.sm]}>
      <View style={styles.mainSection}>
        <Animated.View
          style={[
            styles.emojiContainer,
            { transform: [{ scale: scaleAnim }, { scale: flameScale }] },
          ]}
        >
          <Text style={styles.emoji}>{getStreakEmoji()}</Text>
        </Animated.View>
        <View style={styles.textContainer}>
          <Text style={[styles.count, { color: getStreakColor() }]}>
            {currentStreak}
          </Text>
          <Text style={styles.label}>
            {t('gamification.day_streak', { count: currentStreak })}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsSection}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{longestStreak}</Text>
          <Text style={styles.statLabel}>{t('gamification.longest')}</Text>
        </View>
        <View style={styles.stat}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActiveToday ? colors.success : colors.gray400 },
            ]}
          />
          <Text style={styles.statLabel}>
            {isActiveToday ? t('gamification.active_today') : t('gamification.not_active')}
          </Text>
        </View>
      </View>

      {currentStreak > 0 && currentStreak < longestStreak && (
        <View style={styles.encouragement}>
          <Text style={styles.encouragementText}>
            {t('gamification.days_to_beat', { days: longestStreak - currentStreak })}
          </Text>
        </View>
      )}

      {currentStreak >= longestStreak && currentStreak > 0 && (
        <View style={[styles.encouragement, { backgroundColor: colors.successLight }]}>
          <Text style={[styles.encouragementText, { color: colors.success }]}>
            {t('gamification.personal_best')}
          </Text>
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactEmoji: {
    fontSize: 16,
  },
  compactCount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  mainSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  textContainer: {
    marginLeft: spacing.md,
  },
  count: {
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  label: {
    fontSize: 14,
    color: colors.gray600,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.md,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  encouragement: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  encouragementText: {
    fontSize: 13,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default StreakCounter;
