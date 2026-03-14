/**
 * Orders Slice - Manages store orders
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { storeAPI } from '../../services/api';
import { extractErrorMessage } from '../../utils/errorUtils';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  merchantId: string;
  customerPhone: string;
  customerName: string | null;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentId: string | null;
  createdAt: string;
}

interface OrdersState {
  items: Order[];
  total: number;
  page: number;
  isLoading: boolean;
  error: string | null;
  statusFilter: string | null;
}

const initialState: OrdersState = {
  items: [],
  total: 0,
  page: 1,
  isLoading: false,
  error: null,
  statusFilter: null,
};

// Async thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetch',
  async (
    { page = 1, status }: { page?: number; status?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await storeAPI.listOrders({ page, status });
      return { ...response, page };
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch orders'));
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/create',
  async (
    data: {
      customer_phone: string;
      customer_name?: string;
      items: Array<{ product_id: string; quantity: number; price: number }>;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await storeAPI.createOrder(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to create order'));
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async (
    { id, status }: { id: string; status: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await storeAPI.updateOrderStatus(id, status);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to update order status'));
    }
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setStatusFilter: (state, action: PayloadAction<string | null>) => {
      state.statusFilter = action.payload;
    },
    clearOrders: (state) => {
      state.items = [];
      state.page = 1;
      state.total = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Orders
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.page === 1) {
          state.items = action.payload.items;
        } else {
          state.items = [...state.items, ...action.payload.items];
        }
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Order
    builder
      .addCase(createOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Order Status
    builder
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });
  },
});

export const { setStatusFilter, clearOrders, clearError } = ordersSlice.actions;
export default ordersSlice.reducer;
