/**
 * OrdersScreen - Order management
 * Features: scrollable status tabs (All, Pending, Confirmed, Completed, Cancelled),
 * order cards with ID, customer, items, amount, status,
 * action buttons per status (Confirm, Complete, Cancel),
 * pull-to-refresh, empty states per tab
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Text,
  Surface,
  Chip,
  IconButton,
  ActivityIndicator,
  Button,
  Badge,
  Divider,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { AppDispatch, RootState } from '../../store';
import {
  fetchOrders,
  updateOrderStatus,
  setStatusFilter,
  Order,
} from '../../store/slices/ordersSlice';
import { colors, spacing, shadows } from '../../theme';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const ORDER_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;

const OrdersScreen: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();

  const { items, isLoading, statusFilter, total, page } = useSelector(
    (state: RootState) => state.orders
  );

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(
    (refresh = false) => {
      dispatch(
        fetchOrders({
          page: refresh ? 1 : page,
          status: statusFilter || undefined,
        })
      );
    },
    [dispatch, page, statusFilter]
  );

  useEffect(() => {
    loadOrders(true);
  }, [statusFilter]);

  const handleStatusChange = async (order: Order, newStatus: string) => {
    Alert.alert(
      t('store.updateStatus'),
      t('store.updateStatusConfirm', { status: t(`store.orderStatus.${newStatus}`) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setUpdatingOrderId(order.id);
            try {
              await dispatch(updateOrderStatus({ id: order.id, status: newStatus })).unwrap();
            } catch (error: any) {
              Alert.alert(t('common.error'), error);
            }
            setUpdatingOrderId(null);
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'confirmed':
        return colors.info;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'clock-outline';
      case 'confirmed':
        return 'check';
      case 'completed':
        return 'check-all';
      case 'cancelled':
        return 'close';
      default:
        return 'help';
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'pending':
        return 'confirmed';
      case 'confirmed':
        return 'completed';
      default:
        return null;
    }
  };

  const getEmptyState = () => {
    const filter = statusFilter;
    switch (filter) {
      case 'pending':
        return {
          icon: 'clock-outline',
          title: t('store.noPendingOrders', { defaultValue: 'No Pending Orders' }),
          text: t('store.noPendingOrdersHint', { defaultValue: 'New orders will show up here' }),
        };
      case 'confirmed':
        return {
          icon: 'check',
          title: t('store.noConfirmedOrders', { defaultValue: 'No Confirmed Orders' }),
          text: t('store.noConfirmedOrdersHint', { defaultValue: 'Confirmed orders ready for delivery will appear here' }),
        };
      case 'completed':
        return {
          icon: 'check-all',
          title: t('store.noCompletedOrders', { defaultValue: 'No Completed Orders' }),
          text: t('store.noCompletedOrdersHint', { defaultValue: 'Your completed order history will appear here' }),
        };
      case 'cancelled':
        return {
          icon: 'close-circle-outline',
          title: t('store.noCancelledOrders', { defaultValue: 'No Cancelled Orders' }),
          text: t('store.noCancelledOrdersHint', { defaultValue: 'Good news! No orders have been cancelled' }),
        };
      default:
        return {
          icon: 'cart-off',
          title: t('store.noOrders'),
          text: t('store.noOrdersHint'),
        };
    }
  };

  const renderStatusTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabScrollView}
      contentContainerStyle={styles.tabContainer}
    >
      <Chip
        selected={statusFilter === null}
        onPress={() => dispatch(setStatusFilter(null))}
        style={[
          styles.tab,
          statusFilter === null && styles.selectedTab,
        ]}
        textStyle={[
          styles.tabText,
          statusFilter === null && styles.selectedTabText,
        ]}
        icon={statusFilter === null ? 'format-list-bulleted' : undefined}
      >
        {t('store.allOrders')}
      </Chip>
      {ORDER_STATUSES.map((status) => {
        const isSelected = statusFilter === status;
        const statusColor = getStatusColor(status);
        return (
          <Chip
            key={status}
            selected={isSelected}
            onPress={() => dispatch(setStatusFilter(status))}
            style={[
              styles.tab,
              isSelected && { backgroundColor: statusColor + '20', borderColor: statusColor },
            ]}
            textStyle={[
              styles.tabText,
              isSelected && { color: statusColor },
            ]}
            icon={isSelected ? getStatusIcon(status) : undefined}
          >
            {t(`store.orderStatus.${status}`)}
          </Chip>
        );
      })}
    </ScrollView>
  );

  const renderOrder = ({ item }: { item: Order }) => {
    const nextStatus = getNextStatus(item.status);
    const isUpdating = updatingOrderId === item.id;

    return (
      <Surface style={styles.orderCard}>
        {/* Header */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{formatDateTime(item.createdAt)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '15' },
            ]}
          >
            <Icon
              name={getStatusIcon(item.status)}
              size={14}
              color={getStatusColor(item.status)}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {t(`store.orderStatus.${item.status}`)}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Customer Info */}
        <View style={styles.customerInfo}>
          <Icon name="account" size={16} color={colors.textSecondary} />
          <Text style={styles.customerName}>
            {item.customerName || t('store.unknownCustomer')}
          </Text>
          {item.customerPhone && (
            <>
              <Icon name="phone" size={16} color={colors.textSecondary} style={styles.phoneIcon} />
              <Text style={styles.customerPhone}>{item.customerPhone}</Text>
            </>
          )}
        </View>

        {/* Items */}
        <View style={styles.itemsContainer}>
          {item.items.map((orderItem, index) => (
            <View key={index} style={styles.orderItem}>
              <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
              <Text style={styles.itemName} numberOfLines={1}>
                {orderItem.productName}
              </Text>
              <Text style={styles.itemPrice}>{formatCurrency(orderItem.price * orderItem.quantity)}</Text>
            </View>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Footer */}
        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.totalLabel}>{t('store.total')}</Text>
            <Text style={styles.totalAmount}>{formatCurrency(item.total)}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {isUpdating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                {item.status === 'pending' && (
                  <IconButton
                    icon="close"
                    size={20}
                    iconColor={colors.error}
                    onPress={() => handleStatusChange(item, 'cancelled')}
                    style={styles.cancelBtn}
                  />
                )}
                {nextStatus && (
                  <Button
                    mode="contained"
                    compact
                    onPress={() => handleStatusChange(item, nextStatus)}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: getStatusColor(nextStatus) },
                    ]}
                    labelStyle={styles.actionBtnLabel}
                  >
                    {t(`store.action.${nextStatus}`)}
                  </Button>
                )}
              </>
            )}
          </View>
        </View>
      </Surface>
    );
  };

  const renderEmpty = () => {
    const emptyState = getEmptyState();
    return (
      <View style={styles.emptyContainer}>
        <Icon name={emptyState.icon} size={64} color={colors.textDisabled} />
        <Text style={styles.emptyTitle}>{emptyState.title}</Text>
        <Text style={styles.emptyText}>{emptyState.text}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || items.length === 0) return null;
    return <ActivityIndicator style={styles.footer} />;
  };

  return (
    <View style={styles.container}>
      {/* Status Tabs */}
      {renderStatusTabs()}

      {/* Order Count */}
      <Text style={styles.countText}>
        {total} {t('store.orders', { count: total })}
      </Text>

      {/* Orders List */}
      {isLoading && items.length === 0 ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={items}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && items.length > 0}
              onRefresh={() => loadOrders(true)}
            />
          }
          onEndReached={() => {
            if (items.length < total) {
              dispatch(
                fetchOrders({
                  page: page + 1,
                  status: statusFilter || undefined,
                })
              );
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
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
  tabScrollView: {
    maxHeight: 56,
  },
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    marginBottom: 0,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedTab: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
  },
  selectedTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  countText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  orderCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    marginVertical: spacing.md,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  customerName: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  phoneIcon: {
    marginLeft: spacing.md,
  },
  customerPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  itemsContainer: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    padding: spacing.sm,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    width: 30,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  itemPrice: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelBtn: {
    marginRight: spacing.xs,
  },
  actionBtn: {
    marginLeft: spacing.sm,
  },
  actionBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
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
    paddingHorizontal: spacing.lg,
  },
  footer: {
    marginVertical: spacing.md,
  },
});

export default OrdersScreen;
