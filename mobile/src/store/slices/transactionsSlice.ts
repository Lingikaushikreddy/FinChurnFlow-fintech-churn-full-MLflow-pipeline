/**
 * Transactions Slice - Manages transaction history
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { transactionsAPI } from '../../services/api';
import { extractErrorMessage } from '../../utils/errorUtils';

interface Transaction {
  id: string;
  merchantId: string;
  type: 'payment' | 'payout' | 'salary' | 'refund';
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  referenceId: string | null;
  counterpartyName: string | null;
  counterpartyUpi: string | null;
  counterpartyPhone: string | null;
  description: string | null;
  createdAt: string;
}

interface TransactionsState {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  filters: {
    type: string | null;
    status: string | null;
    fromDate: string | null;
    toDate: string | null;
  };
}

const initialState: TransactionsState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  filters: {
    type: null,
    status: null,
    fromDate: null,
    toDate: null,
  },
};

// Async thunks
export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async (
    { page = 1, refresh = false }: { page?: number; refresh?: boolean },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { transactions: TransactionsState };
      const { filters, pageSize } = state.transactions;

      const response = await transactionsAPI.list({
        page,
        pageSize,
        ...filters,
      });

      return { ...response, page, refresh };
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch transactions'));
    }
  }
);

export const fetchTransactionDetails = createAsyncThunk(
  'transactions/fetchDetails',
  async (transactionId: string, { rejectWithValue }) => {
    try {
      const response = await transactionsAPI.getById(transactionId);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch transaction'));
    }
  }
);

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.items = [];
      state.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.items = [];
      state.page = 1;
    },
    clearTransactions: (state) => {
      state.items = [];
      state.page = 1;
      state.total = 0;
    },
    addTransaction: (state, action) => {
      // Add new transaction at the beginning
      state.items.unshift(action.payload);
      state.total += 1;
    },
    updateTransactionStatus: (state, action) => {
      const { id, status } = action.payload;
      const transaction = state.items.find((t) => t.id === id);
      if (transaction) {
        transaction.status = status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state, action) => {
        if (action.meta.arg.page === 1 || action.meta.arg.refresh) {
          state.isLoading = true;
        } else {
          state.isLoadingMore = true;
        }
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoadingMore = false;

        if (action.payload.refresh || action.payload.page === 1) {
          state.items = action.payload.items;
        } else {
          state.items = [...state.items, ...action.payload.items];
        }

        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoadingMore = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setFilters,
  clearFilters,
  clearTransactions,
  addTransaction,
  updateTransactionStatus,
} = transactionsSlice.actions;

export default transactionsSlice.reducer;
