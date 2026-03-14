/**
 * Dashboard Screen - Main home screen with today's snapshot
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Surface,
  Avatar,
  Card,
  ActivityIndicator,
  FAB,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { AppDispatch, RootState } from '../../store';
import { fetchProfile, fetchDashboard } from '../../store/slices/merchantSlice';
import { fetchTransactions } from '../../store/slices/transactionsSlice';
import { colors, spacing, shadows } from '../../theme';

const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();

  const { profile, dashboard, isLoading } = useSelector(
    (state: RootState) => state.merchant
  );
  const { items: transactions } = useSelector(
    (state: RootState) => state.transactions
  );

  const loadData = useCallback(async () => {
    await Promise.all([
      dispatch(fetchProfile()),
      dispatch(fetchDashboard()),
      dispatch(fetchTransactions({ page: 1, refresh: true })),
    ]);
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greeting.morning');
    if (hour < 17) return t('home.greeting.afternoon');
    return t('home.greeting.evening');
  };

  const recentTransactions = transactions.slice(0, 5);

  const handleAIPress = () => {
    navigation.getParent()?.navigate('AIChat');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadData} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.merchantName}>
            {profile?.name || 'Merchant'}
          </Text>
        </View>
        <Avatar.Text
          size={48}
          label={profile?.name?.charAt(0) || 'M'}
          style={styles.avatar}
        />
      </View>

      {/* Today's Summary Card */}
      <Surface style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today's Summary</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Collection</Text>
            <Text style={[styles.statValue, styles.collectionValue]}>
              {formatCurrency(dashboard?.today_collection || 0)}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Payouts</Text>
            <Text style={[styles.statValue, styles.payoutValue]}>
              {formatCurrency(dashboard?.today_payouts || 0)}
            </Text>
          </View>
        </View>

        <View style={styles.netBalance}>
          <Text style={styles.netLabel}>Net Balance</Text>
          <Text style={styles.netValue}>
            {formatCurrency(
              (dashboard?.today_collection || 0) - (dashboard?.today_payouts || 0)
            )}
          </Text>
        </View>
      </Surface>

      {/* Quick Actions - Row 1 */}
      <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
      <View style={styles.actionsGrid}>
        <QuickAction
          icon="qrcode"
          label={t('home.showQr')}
          color={colors.primary}
          onPress={() => navigation.navigate('Payments', { screen: 'QRCode' })}
        />
        <QuickAction
          icon="link-variant"
          label={t('home.createLink')}
          color={colors.secondary}
          onPress={() => navigation.navigate('Payments', { screen: 'PaymentLinks' })}
        />
        <QuickAction
          icon="send"
          label={t('home.sendMoney')}
          color={colors.warning}
          onPress={() => navigation.navigate('Payouts', { screen: 'PayoutMain' })}
        />
        <QuickAction
          icon="account-group"
          label={t('home.contacts')}
          color={colors.info}
          onPress={() => navigation.navigate('Payouts', { screen: 'Contacts' })}
        />
      </View>

      {/* Quick Actions - Row 2 (Store, Payroll, Reports) */}
      <View style={styles.actionsGrid}>
        <QuickAction
          icon="store"
          label={t('store.title')}
          color="#9C27B0"
          onPress={() => navigation.getParent()?.navigate('StoreStack')}
        />
        <QuickAction
          icon="cash-multiple"
          label={t('payroll.title')}
          color="#FF5722"
          onPress={() => navigation.getParent()?.navigate('PayrollStack')}
        />
        <QuickAction
          icon="chart-bar"
          label="Reports"
          color="#00BCD4"
          onPress={() => navigation.getParent()?.navigate('Reports')}
        />
        <QuickAction
          icon="robot"
          label={t('ai.assistant')}
          color={colors.primary}
          onPress={handleAIPress}
        />
      </View>

      {/* Recent Transactions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Transactions' as never)}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {isLoading && recentTransactions.length === 0 ? (
        <ActivityIndicator style={styles.loader} />
      ) : recentTransactions.length === 0 ? (
        <Surface style={styles.emptyCard}>
          <Icon name="cash-multiple" size={48} color={colors.textDisabled} />
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubtext}>
            Create a payment link to start receiving payments
          </Text>
        </Surface>
      ) : (
        <View style={styles.transactionsList}>
          {recentTransactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </View>
      )}

      {/* Floating AI Button */}
      <FAB
        icon="robot"
        style={styles.fab}
        onPress={handleAIPress}
        color={colors.textInverse}
      />
    </ScrollView>
  );
};

// Quick Action Component
const QuickAction: React.FC<{
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}> = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress}>
    <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
      <Icon name={icon} size={24} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

// Transaction Item Component
const TransactionItem: React.FC<{ transaction: any }> = ({ transaction }) => {
  const isCredit = transaction.type === 'payment';
  const statusColors: Record<string, string> = {
    completed: colors.success,
    pending: colors.warning,
    failed: colors.error,
  };

  return (
    <Surface style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.transactionIcon,
            { backgroundColor: isCredit ? colors.success + '15' : colors.error + '15' },
          ]}
        >
          <Icon
            name={isCredit ? 'arrow-down' : 'arrow-up'}
            size={20}
            color={isCredit ? colors.success : colors.error}
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionName}>
            {transaction.counterparty_name || (isCredit ? 'Payment Received' : 'Payout')}
          </Text>
          <Text style={styles.transactionMeta}>
            {new Date(transaction.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text
          style={[
            styles.transactionAmount,
            { color: isCredit ? colors.success : colors.error },
          ]}
        >
          {isCredit ? '+' : '-'}₹{transaction.amount}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColors[transaction.status] + '15' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusColors[transaction.status] },
            ]}
          >
            {transaction.status}
          </Text>
        </View>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  merchantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  collectionValue: {
    color: colors.success,
  },
  payoutValue: {
    color: colors.error,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  netBalance: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  netValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  actionItem: {
    alignItems: 'center',
    width: '22%',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  transactionsList: {
    gap: spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  transactionMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
  },
});

export default DashboardScreen;
