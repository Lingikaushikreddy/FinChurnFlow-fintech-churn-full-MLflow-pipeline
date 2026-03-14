/**
 * useOrders Hook - Order management utilities
 */

import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchOrders,
  createOrder,
  updateOrderStatus,
  setStatusFilter,
  clearOrders,
  Order,
} from '../store/slices/ordersSlice';

interface UseOrdersOptions {
  autoFetch?: boolean;
  status?: string;
}

export const useOrders = (options: UseOrdersOptions = {}) => {
  const { autoFetch = true, status } = options;
  const dispatch = useDispatch<AppDispatch>();

  const {
    items: orders,
    total,
    page,
    isLoading,
    error,
    statusFilter,
  } = useSelector((state: RootState) => state.orders);

  const loadOrders = useCallback(
    (refresh = false) => {
      return dispatch(
        fetchOrders({
          page: refresh ? 1 : page,
          status: status || statusFilter || undefined,
        })
      );
    },
    [dispatch, page, status, statusFilter]
  );

  const addOrder = useCallback(
    (data: {
      customer_phone: string;
      customer_name?: string;
      items: Array<{ product_id: string; quantity: number; price: number }>;
    }) => {
      return dispatch(createOrder(data));
    },
    [dispatch]
  );

  const changeOrderStatus = useCallback(
    (id: string, newStatus: string) => {
      return dispatch(updateOrderStatus({ id, status: newStatus }));
    },
    [dispatch]
  );

  const filterByStatus = useCallback(
    (newStatus: string | null) => {
      dispatch(setStatusFilter(newStatus));
    },
    [dispatch]
  );

  const loadMore = useCallback(() => {
    if (orders.length < total && !isLoading) {
      dispatch(
        fetchOrders({
          page: page + 1,
          status: status || statusFilter || undefined,
        })
      );
    }
  }, [dispatch, orders.length, total, isLoading, page, status, statusFilter]);

  const refresh = useCallback(() => {
    dispatch(clearOrders());
    return loadOrders(true);
  }, [dispatch, loadOrders]);

  // Calculate stats
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const confirmedOrders = orders.filter((o) => o.status === 'confirmed');
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);

  useEffect(() => {
    if (autoFetch) {
      loadOrders(true);
    }
  }, [autoFetch, statusFilter]);

  return {
    // State
    orders,
    total,
    page,
    isLoading,
    error,
    statusFilter,
    hasMore: orders.length < total,

    // Computed
    pendingOrders,
    confirmedOrders,
    completedOrders,
    pendingCount: pendingOrders.length,
    totalRevenue,

    // Actions
    loadOrders,
    addOrder,
    changeOrderStatus,
    filterByStatus,
    loadMore,
    refresh,
  };
};

export default useOrders;
