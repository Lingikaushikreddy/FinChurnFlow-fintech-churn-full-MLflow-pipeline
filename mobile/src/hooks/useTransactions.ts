/**
 * useTransactions Hook - Transaction state and actions
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchTransactions,
  setFilters,
  clearFilters,
} from '../store/slices/transactionsSlice';

export const useTransactions = () => {
  const dispatch = useDispatch<AppDispatch>();
  const transactions = useSelector((state: RootState) => state.transactions);

  const loadTransactions = useCallback(
    async (options?: { page?: number; refresh?: boolean }) => {
      return dispatch(
        fetchTransactions({
          page: options?.page || 1,
          refresh: options?.refresh ?? false,
        })
      ).unwrap();
    },
    [dispatch]
  );

  const handleSetFilters = useCallback(
    (filters: { type?: string; status?: string; dateRange?: any }) => {
      dispatch(setFilters(filters));
    },
    [dispatch]
  );

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  const refreshTransactions = useCallback(() => {
    return loadTransactions({ refresh: true });
  }, [loadTransactions]);

  const loadMore = useCallback(() => {
    if (!transactions.isLoadingMore && transactions.items.length < transactions.total) {
      return loadTransactions({ page: transactions.page + 1 });
    }
    return Promise.resolve();
  }, [loadTransactions, transactions.isLoadingMore, transactions.items.length, transactions.total, transactions.page]);

  return {
    ...transactions,
    loadTransactions,
    refreshTransactions,
    loadMore,
    setFilters: handleSetFilters,
    clearFilters: handleClearFilters,
  };
};

export default useTransactions;
