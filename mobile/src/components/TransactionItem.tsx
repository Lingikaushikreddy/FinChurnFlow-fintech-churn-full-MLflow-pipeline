/**
 * Transaction Item Component - Displays a single transaction
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, shadows } from '../theme';

export interface Transaction {
  id: string;
  type: 'payment' | 'payout';
  amount: number;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  counterparty_name?: string;
  description?: string;
  created_at: string;
  reference_id?: string;
}

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
}) => {
  const isCredit = transaction.type === 'payment';

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (date.toDateString() === now.toDateString()) {
      return `Today, ${timeStr}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    } else {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      }) + `, ${timeStr}`;
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

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'pending':
        return 'clock-outline';
      case 'processing':
        return 'progress-clock';
      case 'failed':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const getTransactionIcon = (): string => {
    if (transaction.type === 'payment') {
      return 'arrow-bottom-left';
    }
    return 'arrow-top-right';
  };

  const getTransactionTitle = (): string => {
    if (transaction.counterparty_name) {
      return transaction.counterparty_name;
    }
    return isCredit ? 'Payment Received' : 'Payout Sent';
  };

  const handlePress = () => {
    if (onPress) {
      onPress(transaction);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: (isCredit ? colors.success : colors.error) + '15' },
        ]}
      >
        <Icon
          name={getTransactionIcon()}
          size={24}
          color={isCredit ? colors.success : colors.error}
        />
      </View>

      {/* Details */}
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {getTransactionTitle()}
        </Text>
        {transaction.description && (
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.date}>{formatDate(transaction.created_at)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(transaction.status) + '15' },
            ]}
          >
            <Icon
              name={getStatusIcon(transaction.status)}
              size={12}
              color={getStatusColor(transaction.status)}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(transaction.status) },
              ]}
            >
              {transaction.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Amount */}
      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amount,
            { color: isCredit ? colors.success : colors.error },
          ]}
        >
          {isCredit ? '+' : '-'}₹{formatAmount(transaction.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: spacing.sm,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  amountContainer: {
    marginLeft: spacing.sm,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TransactionItem;
