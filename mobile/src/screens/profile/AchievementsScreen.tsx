/**
 * AchievementsScreen - Display achievements and streak
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Text, Appbar, Surface, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useGamification } from '../../hooks';
import { AchievementBadge, StreakCounter } from '../../components';
import { colors, spacing, shadows } from '../../theme';

export const AchievementsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const {
    unlockedAchievements,
    lockedAchievements,
    currentStreak,
    longestStreak,
    lastActiveDate,
    getAchievementProgress,
  } = useGamification();

  const achievementsWithProgress = lockedAchievements.map((a) => ({
    ...a,
    progress: getAchievementProgress(a.id),
  }));

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={t('gamification.achievements')} />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Card */}
        <StreakCounter
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          lastActiveDate={lastActiveDate || undefined}
        />

        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <Surface style={[styles.section, shadows.sm]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('gamification.unlocked')} ({unlockedAchievements.length})
              </Text>
            </View>
            <View style={styles.achievementsGrid}>
              {unlockedAchievements.map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  size="medium"
                />
              ))}
            </View>
          </Surface>
        )}

        {/* Locked Achievements */}
        {achievementsWithProgress.length > 0 && (
          <Surface style={[styles.section, shadows.sm]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('gamification.locked')} ({achievementsWithProgress.length})
              </Text>
              <Text style={styles.sectionSubtitle}>{t('gamification.keepGoing')}</Text>
            </View>
            <View style={styles.achievementsGrid}>
              {achievementsWithProgress.map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  size="medium"
                  showProgress
                />
              ))}
            </View>
          </Surface>
        )}

        {/* Stats Summary */}
        <Surface style={[styles.section, shadows.sm]}>
          <Text style={styles.sectionTitle}>Progress Stats</Text>
          <Divider style={styles.divider} />
          <View style={styles.statsGrid}>
            <StatItem
              label="Achievements"
              value={`${unlockedAchievements.length}/${unlockedAchievements.length + lockedAchievements.length}`}
              icon="🏆"
            />
            <StatItem
              label="Current Streak"
              value={`${currentStreak} days`}
              icon="🔥"
            />
            <StatItem
              label="Best Streak"
              value={`${longestStreak} days`}
              icon="⭐"
            />
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

interface StatItemProps {
  label: string;
  value: string;
  icon: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, icon }) => (
  <View style={styles.statItem}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    elevation: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-start',
  },
  divider: {
    marginVertical: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
});

export default AchievementsScreen;
