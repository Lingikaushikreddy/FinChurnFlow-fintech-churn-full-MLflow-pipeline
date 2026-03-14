/**
 * SkeletonLoader Components
 * Placeholder loading states for better UX
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, Dimensions } from 'react-native';
import { colors, spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Base skeleton component with shimmer animation
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton for transaction items
export const TransactionSkeleton: React.FC = () => (
  <View style={styles.transactionContainer}>
    <Skeleton width={48} height={48} borderRadius={24} />
    <View style={styles.transactionContent}>
      <Skeleton width="60%" height={16} style={styles.mb8} />
      <Skeleton width="40%" height={12} />
    </View>
    <View style={styles.transactionRight}>
      <Skeleton width={80} height={16} style={styles.mb8} />
      <Skeleton width={50} height={12} />
    </View>
  </View>
);

// Skeleton for list of transactions
export const TransactionListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <TransactionSkeleton key={index} />
    ))}
  </View>
);

// Skeleton for product cards (grid)
export const ProductCardSkeleton: React.FC = () => (
  <View style={styles.productCard}>
    <Skeleton width="100%" height={120} borderRadius={8} style={styles.mb12} />
    <Skeleton width="80%" height={14} style={styles.mb8} />
    <Skeleton width="50%" height={18} />
  </View>
);

// Skeleton for product grid
export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <View style={styles.productGrid}>
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </View>
);

// Skeleton for employee/contact items
export const ContactSkeleton: React.FC = () => (
  <View style={styles.contactContainer}>
    <Skeleton width={48} height={48} borderRadius={24} />
    <View style={styles.contactContent}>
      <Skeleton width="50%" height={16} style={styles.mb8} />
      <Skeleton width="70%" height={12} />
    </View>
    <Skeleton width={24} height={24} borderRadius={12} />
  </View>
);

// Skeleton for list of contacts/employees
export const ContactListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <ContactSkeleton key={index} />
    ))}
  </View>
);

// Skeleton for dashboard summary cards
export const DashboardCardSkeleton: React.FC = () => (
  <View style={styles.dashboardCard}>
    <Skeleton width={40} height={40} borderRadius={20} style={styles.mb12} />
    <Skeleton width="60%" height={14} style={styles.mb8} />
    <Skeleton width="80%" height={24} />
  </View>
);

// Skeleton for dashboard
export const DashboardSkeleton: React.FC = () => (
  <View style={styles.dashboard}>
    {/* Header */}
    <View style={styles.dashboardHeader}>
      <View>
        <Skeleton width={120} height={16} style={styles.mb8} />
        <Skeleton width={180} height={24} />
      </View>
      <Skeleton width={48} height={48} borderRadius={24} />
    </View>

    {/* Summary Cards */}
    <View style={styles.summaryRow}>
      <DashboardCardSkeleton />
      <DashboardCardSkeleton />
      <DashboardCardSkeleton />
    </View>

    {/* Quick Actions */}
    <View style={styles.quickActionsRow}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.quickAction}>
          <Skeleton width={56} height={56} borderRadius={28} style={styles.mb8} />
          <Skeleton width={50} height={12} />
        </View>
      ))}
    </View>

    {/* Recent Transactions */}
    <Skeleton width={150} height={20} style={styles.mb16} />
    <TransactionListSkeleton count={3} />
  </View>
);

// Skeleton for chat messages
export const ChatMessageSkeleton: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => (
  <View
    style={[
      styles.chatMessage,
      isUser ? styles.chatMessageUser : styles.chatMessageAssistant,
    ]}
  >
    <Skeleton
      width={isUser ? 150 : 200}
      height={40}
      borderRadius={16}
      style={{ backgroundColor: isUser ? colors.primaryLight : colors.gray200 }}
    />
  </View>
);

// Skeleton for chat
export const ChatSkeleton: React.FC = () => (
  <View style={styles.chat}>
    <ChatMessageSkeleton isUser={false} />
    <ChatMessageSkeleton isUser={true} />
    <ChatMessageSkeleton isUser={false} />
    <ChatMessageSkeleton isUser={true} />
  </View>
);

// Skeleton for order items
export const OrderSkeleton: React.FC = () => (
  <View style={styles.orderContainer}>
    <View style={styles.orderHeader}>
      <Skeleton width={100} height={14} />
      <Skeleton width={70} height={24} borderRadius={12} />
    </View>
    <Skeleton width="60%" height={16} style={styles.mb8} />
    <Skeleton width="40%" height={12} style={styles.mb12} />
    <View style={styles.orderFooter}>
      <Skeleton width={80} height={20} />
      <Skeleton width={100} height={32} borderRadius={16} />
    </View>
  </View>
);

// Skeleton for order list
export const OrderListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <OrderSkeleton key={index} />
    ))}
  </View>
);

// Skeleton for reports/charts
export const ChartSkeleton: React.FC = () => (
  <View style={styles.chartContainer}>
    <View style={styles.chartHeader}>
      <Skeleton width={120} height={20} />
      <Skeleton width={80} height={16} />
    </View>
    <View style={styles.chartBars}>
      {Array.from({ length: 7 }).map((_, index) => (
        <View key={index} style={styles.chartBarContainer}>
          <Skeleton
            width={24}
            height={40 + Math.random() * 80}
            borderRadius={4}
          />
          <Skeleton width={24} height={10} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  </View>
);

// Skeleton for form fields
export const FormFieldSkeleton: React.FC = () => (
  <View style={styles.formField}>
    <Skeleton width={80} height={12} style={styles.mb8} />
    <Skeleton width="100%" height={48} borderRadius={8} />
  </View>
);

// Skeleton for form
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <View style={styles.form}>
    {Array.from({ length: fields }).map((_, index) => (
      <FormFieldSkeleton key={index} />
    ))}
    <Skeleton width="100%" height={48} borderRadius={24} style={{ marginTop: spacing.lg }} />
  </View>
);

// Full screen skeleton
export const FullScreenSkeleton: React.FC<{ type?: 'list' | 'grid' | 'form' | 'dashboard' }> = ({
  type = 'list',
}) => {
  switch (type) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'grid':
      return <ProductGridSkeleton />;
    case 'form':
      return <FormSkeleton />;
    case 'list':
    default:
      return <TransactionListSkeleton />;
  }
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.gray200,
  },
  mb8: {
    marginBottom: 8,
  },
  mb12: {
    marginBottom: 12,
  },
  mb16: {
    marginBottom: 16,
  },

  // Transaction
  transactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  transactionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },

  // Product
  productCard: {
    width: (SCREEN_WIDTH - spacing.md * 3) / 2,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.md,
  },

  // Contact
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  contactContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  // Dashboard
  dashboard: {
    padding: spacing.md,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dashboardCard: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  quickAction: {
    alignItems: 'center',
  },

  // Chat
  chat: {
    padding: spacing.md,
  },
  chatMessage: {
    marginBottom: spacing.md,
  },
  chatMessageUser: {
    alignItems: 'flex-end',
  },
  chatMessageAssistant: {
    alignItems: 'flex-start',
  },

  // Order
  orderContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  // Chart
  chartContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  chartBarContainer: {
    alignItems: 'center',
  },

  // Form
  form: {
    padding: spacing.md,
  },
  formField: {
    marginBottom: spacing.md,
  },
});

export default {
  Skeleton,
  TransactionSkeleton,
  TransactionListSkeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  ContactSkeleton,
  ContactListSkeleton,
  DashboardCardSkeleton,
  DashboardSkeleton,
  ChatMessageSkeleton,
  ChatSkeleton,
  OrderSkeleton,
  OrderListSkeleton,
  ChartSkeleton,
  FormFieldSkeleton,
  FormSkeleton,
  FullScreenSkeleton,
};
