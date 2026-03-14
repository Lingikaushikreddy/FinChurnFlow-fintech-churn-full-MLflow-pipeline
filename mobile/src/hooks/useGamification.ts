/**
 * useGamification Hook - Achievement and streak tracking
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Achievement, ACHIEVEMENTS } from '../components/AchievementBadge';

const STORAGE_KEYS = {
  ACHIEVEMENTS: '@gamification_achievements',
  STREAK: '@gamification_streak',
  STATS: '@gamification_stats',
};

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

interface Stats {
  totalPaymentsReceived: number;
  totalPayoutsSent: number;
  totalProductsAdded: number;
  totalOrdersReceived: number;
  totalEmployeesAdded: number;
  totalSalariesPaid: number;
  totalVoiceCommands: number;
  totalAmountCollected: number;
}

interface UseGamificationReturn {
  achievements: Achievement[];
  unlockedAchievements: Achievement[];
  lockedAchievements: Achievement[];
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
  stats: Stats;
  checkAndUnlockAchievements: () => Promise<Achievement[]>;
  recordActivity: () => Promise<void>;
  incrementStat: (stat: keyof Stats, amount?: number) => Promise<Achievement[]>;
  getAchievementProgress: (achievementId: string) => number;
  resetGamification: () => Promise<void>;
}

const defaultStats: Stats = {
  totalPaymentsReceived: 0,
  totalPayoutsSent: 0,
  totalProductsAdded: 0,
  totalOrdersReceived: 0,
  totalEmployeesAdded: 0,
  totalSalariesPaid: 0,
  totalVoiceCommands: 0,
  totalAmountCollected: 0,
};

const defaultStreak: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
};

export const useGamification = (): UseGamificationReturn => {
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [streak, setStreak] = useState<StreakData>(defaultStreak);
  const [stats, setStats] = useState<Stats>(defaultStats);

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const [savedAchievements, savedStreak, savedStats] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.STREAK),
        AsyncStorage.getItem(STORAGE_KEYS.STATS),
      ]);

      if (savedAchievements) {
        const unlockedIds = JSON.parse(savedAchievements) as Record<string, string>;
        setAchievements(
          ACHIEVEMENTS.map((a) => ({
            ...a,
            unlockedAt: unlockedIds[a.id] ? new Date(unlockedIds[a.id]) : undefined,
          }))
        );
      }

      if (savedStreak) {
        setStreak(JSON.parse(savedStreak));
      }

      if (savedStats) {
        setStats({ ...defaultStats, ...JSON.parse(savedStats) });
      }
    } catch (error) {
      console.error('Failed to load gamification data:', error);
    }
  };

  const saveAchievements = async (updatedAchievements: Achievement[]) => {
    const unlockedIds: Record<string, string> = {};
    updatedAchievements.forEach((a) => {
      if (a.unlockedAt) {
        unlockedIds[a.id] = a.unlockedAt.toISOString();
      }
    });
    await AsyncStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(unlockedIds));
  };

  const saveStreak = async (updatedStreak: StreakData) => {
    await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(updatedStreak));
  };

  const saveStats = async (updatedStats: Stats) => {
    await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updatedStats));
  };

  const recordActivity = useCallback(async () => {
    const today = new Date().toDateString();
    const lastActive = streak.lastActiveDate;

    if (lastActive === today) {
      // Already recorded today
      return;
    }

    let newStreak = streak.currentStreak;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastActive === yesterday.toDateString()) {
      // Consecutive day
      newStreak += 1;
    } else if (lastActive !== today) {
      // Streak broken
      newStreak = 1;
    }

    const updatedStreak: StreakData = {
      currentStreak: newStreak,
      longestStreak: Math.max(streak.longestStreak, newStreak),
      lastActiveDate: today,
    };

    setStreak(updatedStreak);
    await saveStreak(updatedStreak);

    // Check streak achievements
    await checkAndUnlockAchievements();
  }, [streak]);

  const getAchievementProgress = useCallback(
    (achievementId: string): number => {
      switch (achievementId) {
        case 'hundred_payments':
          return Math.min(stats.totalPaymentsReceived, 100);
        case 'thousand_payments':
          return Math.min(stats.totalPaymentsReceived, 1000);
        case 'ten_products':
          return Math.min(stats.totalProductsAdded, 10);
        case 'week_streak':
          return Math.min(streak.currentStreak, 7);
        case 'month_streak':
          return Math.min(streak.currentStreak, 30);
        case 'voice_user':
          return Math.min(stats.totalVoiceCommands, 10);
        default:
          return 0;
      }
    },
    [stats, streak]
  );

  const checkAndUnlockAchievements = useCallback(async (): Promise<Achievement[]> => {
    const newlyUnlocked: Achievement[] = [];
    const now = new Date();

    const updatedAchievements = achievements.map((achievement) => {
      if (achievement.unlockedAt) return achievement;

      let shouldUnlock = false;

      switch (achievement.id) {
        case 'first_payment':
          shouldUnlock = stats.totalPaymentsReceived >= 1;
          break;
        case 'hundred_payments':
          shouldUnlock = stats.totalPaymentsReceived >= 100;
          break;
        case 'thousand_payments':
          shouldUnlock = stats.totalPaymentsReceived >= 1000;
          break;
        case 'first_payout':
          shouldUnlock = stats.totalPayoutsSent >= 1;
          break;
        case 'first_employee':
          shouldUnlock = stats.totalEmployeesAdded >= 1;
          break;
        case 'first_salary':
          shouldUnlock = stats.totalSalariesPaid >= 1;
          break;
        case 'first_product':
          shouldUnlock = stats.totalProductsAdded >= 1;
          break;
        case 'ten_products':
          shouldUnlock = stats.totalProductsAdded >= 10;
          break;
        case 'first_order':
          shouldUnlock = stats.totalOrdersReceived >= 1;
          break;
        case 'week_streak':
          shouldUnlock = streak.currentStreak >= 7;
          break;
        case 'month_streak':
          shouldUnlock = streak.currentStreak >= 30;
          break;
        case 'voice_user':
          shouldUnlock = stats.totalVoiceCommands >= 10;
          break;
        case 'lakhs_collected':
          shouldUnlock = stats.totalAmountCollected >= 100000;
          break;
        case 'crore_collected':
          shouldUnlock = stats.totalAmountCollected >= 10000000;
          break;
      }

      if (shouldUnlock) {
        const unlocked = { ...achievement, unlockedAt: now };
        newlyUnlocked.push(unlocked);
        return unlocked;
      }

      return {
        ...achievement,
        progress: getAchievementProgress(achievement.id),
      };
    });

    if (newlyUnlocked.length > 0) {
      setAchievements(updatedAchievements);
      await saveAchievements(updatedAchievements);
    }

    return newlyUnlocked;
  }, [achievements, stats, streak, getAchievementProgress]);

  const incrementStat = useCallback(
    async (stat: keyof Stats, amount = 1): Promise<Achievement[]> => {
      const updatedStats = {
        ...stats,
        [stat]: stats[stat] + amount,
      };

      setStats(updatedStats);
      await saveStats(updatedStats);

      // Record activity for streak
      await recordActivity();

      // Check for new achievements
      return checkAndUnlockAchievements();
    },
    [stats, recordActivity, checkAndUnlockAchievements]
  );

  const resetGamification = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS),
      AsyncStorage.removeItem(STORAGE_KEYS.STREAK),
      AsyncStorage.removeItem(STORAGE_KEYS.STATS),
    ]);

    setAchievements(ACHIEVEMENTS);
    setStreak(defaultStreak);
    setStats(defaultStats);
  }, []);

  const unlockedAchievements = achievements.filter((a) => a.unlockedAt);
  const lockedAchievements = achievements.filter((a) => !a.unlockedAt);

  return {
    achievements,
    unlockedAchievements,
    lockedAchievements,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastActiveDate: streak.lastActiveDate ? new Date(streak.lastActiveDate) : null,
    stats,
    checkAndUnlockAchievements,
    recordActivity,
    incrementStat,
    getAchievementProgress,
    resetGamification,
  };
};

export default useGamification;
