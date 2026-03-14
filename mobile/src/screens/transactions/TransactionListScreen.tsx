/**
 * Transaction List Screen - View transaction history
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Surface,
  Chip,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppDispatch, RootState } from '../../store';
import { fetchTransactions, setFilters, clearFilters } from '../../store/slices/transactionsSlice';
import { colors, spacing, shadows } from '../../theme';

type FilterType = 'all' | 'payment' | 'payout';

const TransactionListScreen: React.FC = () => {
  const [filterType, setFilterType] = useState<FilterType>('all');

  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading, isLoadingMore, total, page, pageSize } = useSelector(
    (state: RootState) => state.transactions
  );

  const loadTransactions = useCallback(
    (refresh = false) => {
      dispatch(fetchTransactions({ page: refresh ? 1 : page + 1, refresh }));
    },
    [dispatch, page]
  );

  useEffect(() => {
    loadTransactions(true);
  }, [filterType]);

  const handleFilterChange = (value: string) => {
    setFilterType(value as FilterType);
    if (value === 'all') {
      dispatch(clearFilters());
    } else {
      dispatch(setFilters({ type: value }));
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'pending':
      case 'processing':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const isCredit = item.type === 'payment';

    return (
      <Surface style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isCredit ? colors.success + '15' : colors.error + '15' },
            ]}
          >
            <Icon
              name={isCredit ? 'arrow-down' : 'arrow-up'}
              size={24}
              color={isCredit ? colors.success : colors.error}
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionName} numberOfLines={1}>
              {item.counterparty_name ||
                (isCredit ? 'Payment Received' : 'Payout Sent')}
            </Text>
            <Text style={styles.transactionType}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
            <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              { color: isCredit ? colors.success : colors.error },
            ]}
          >
            {isCredit ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '15' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {item.status}
            </Text>
          </View>
        </View>
      </Surface>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="receipt" size={64} color={colors.textDisabled} />
      <Text style={styles.emptyTitle}>No Transactions</Text>
      <Text style={styles.emptyText}>
        {filterType !== 'all'
          ? `No ${filterType}s found`
          : 'Your transaction history will appear here'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return <ActivityIndicator style={styles.footer} />;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Filter Chips */}
      <SegmentedButtons
        value={filterType}
        onValueChange={handleFilterChange}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'payment', label: 'Received' },
          { value: 'payout', label: 'Sent' },
        ]}
        style={styles.filterButtons}
      />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{total}</Text>
          <Text style={styles.summaryLabel}>Transactions</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading && items.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && items.length > 0}
              onRefresh={() => loadTransactions(true)}
            />
          }
          onEndReached={() => {
            if (!isLoadingMore && items.length < total) {
              loadTransactions(false);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.md,
  },
  filterButtons: {
    marginBottom: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
  },
  summaryItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  transactionCard: {
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  transactionType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  footer: {
    marginVertical: spacing.md,
  },
});

export default TransactionListScreen;
