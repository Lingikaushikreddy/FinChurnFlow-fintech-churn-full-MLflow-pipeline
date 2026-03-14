/**
 * AchievementBadge Component
 * Displays achievement badges for gamification
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { colors, spacing, shadows } from '../theme';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  onPress?: () => void;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  size = 'medium',
  showProgress = false,
}) => {
  const isUnlocked = !!achievement.unlockedAt;
  const progress = achievement.progress || 0;
  const maxProgress = achievement.maxProgress || 1;
  const progressPercent = Math.min(100, (progress / maxProgress) * 100);

  const sizeConfig = {
    small: { badge: 48, icon: 24, title: 10 },
    medium: { badge: 72, icon: 36, title: 12 },
    large: { badge: 96, icon: 48, title: 14 },
  };

  const config = sizeConfig[size];

  return (
    <View style={styles.container}>
      <Surface
        style={[
          styles.badge,
          {
            width: config.badge,
            height: config.badge,
            borderRadius: config.badge / 2,
            backgroundColor: isUnlocked ? achievement.color : colors.gray200,
            opacity: isUnlocked ? 1 : 0.5,
          },
          isUnlocked && shadows.md,
        ]}
      >
        <Text style={[styles.icon, { fontSize: config.icon }]}>
          {achievement.icon}
        </Text>
        {!isUnlocked && showProgress && (
          <View style={styles.progressOverlay}>
            <View
              style={[
                styles.progressFill,
                {
                  height: `${progressPercent}%`,
                  backgroundColor: achievement.color,
                },
              ]}
            />
          </View>
        )}
      </Surface>
      <Text
        style={[
          styles.title,
          { fontSize: config.title, color: isUnlocked ? colors.text : colors.gray500 },
        ]}
        numberOfLines={2}
      >
        {achievement.title}
      </Text>
      {showProgress && !isUnlocked && (
        <Text style={styles.progressText}>
          {progress}/{maxProgress}
        </Text>
      )}
    </View>
  );
};

// Predefined achievements for Razorpay Nano
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_payment',
    title: 'First Steps',
    description: 'Receive your first payment',
    icon: '🎉',
    color: '#10B981',
  },
  {
    id: 'hundred_payments',
    title: 'Century Club',
    description: 'Receive 100 payments',
    icon: '💯',
    color: '#3B82F6',
    maxProgress: 100,
  },
  {
    id: 'thousand_payments',
    title: 'Merchant Master',
    description: 'Receive 1000 payments',
    icon: '🏆',
    color: '#F59E0B',
    maxProgress: 1000,
  },
  {
    id: 'first_payout',
    title: 'Money Mover',
    description: 'Send your first payout',
    icon: '💸',
    color: '#8B5CF6',
  },
  {
    id: 'first_employee',
    title: 'Team Builder',
    description: 'Add your first employee',
    icon: '👥',
    color: '#EC4899',
  },
  {
    id: 'first_salary',
    title: 'Payday Hero',
    description: 'Process your first salary',
    icon: '💰',
    color: '#14B8A6',
  },
  {
    id: 'first_product',
    title: 'Store Starter',
    description: 'Add your first product',
    icon: '🛍️',
    color: '#F97316',
  },
  {
    id: 'ten_products',
    title: 'Catalog Creator',
    description: 'Add 10 products to your store',
    icon: '📦',
    color: '#6366F1',
    maxProgress: 10,
  },
  {
    id: 'first_order',
    title: 'Order Up!',
    description: 'Receive your first order',
    icon: '📋',
    color: '#84CC16',
  },
  {
    id: 'week_streak',
    title: 'Consistent',
    description: 'Use the app for 7 days in a row',
    icon: '🔥',
    color: '#EF4444',
    maxProgress: 7,
  },
  {
    id: 'month_streak',
    title: 'Dedicated',
    description: 'Use the app for 30 days in a row',
    icon: '⭐',
    color: '#FBBF24',
    maxProgress: 30,
  },
  {
    id: 'voice_user',
    title: 'Voice Commander',
    description: 'Complete 10 actions using voice',
    icon: '🎤',
    color: '#06B6D4',
    maxProgress: 10,
  },
  {
    id: 'lakhs_collected',
    title: 'Lakh Pati',
    description: 'Collect ₹1,00,000 in payments',
    icon: '💎',
    color: '#A855F7',
  },
  {
    id: 'crore_collected',
    title: 'Crorepati',
    description: 'Collect ₹1,00,00,000 in payments',
    icon: '👑',
    color: '#FFD700',
  },
];

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 80,
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  icon: {
    textAlign: 'center',
  },
  title: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 100,
  },
  progressFill: {
    opacity: 0.3,
  },
  progressText: {
    fontSize: 10,
    color: colors.gray500,
    marginTop: 2,
  },
});

export default AchievementBadge;
