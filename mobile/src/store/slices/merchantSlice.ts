/**
 * Merchant Slice - Manages merchant profile and dashboard data
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { merchantAPI } from '../../services/api';
import { extractErrorMessage } from '../../utils/errorUtils';

interface MerchantProfile {
  id: string;
  phone: string;
  name: string | null;
  businessName: string | null;
  upiId: string | null;
  kycStatus: string;
  isActive: boolean;
  createdAt: string;
}

interface DashboardStats {
  todayCollection: number;
  todayPayouts: number;
  todayTransactions: number;
  pendingPayouts: number;
  totalBalance: number;
  weekCollection: number;
  weekGrowthPercent: number;
}

interface MerchantState {
  profile: MerchantProfile | null;
  dashboard: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  isOnboarded: boolean;
}

const initialState: MerchantState = {
  profile: null,
  dashboard: null,
  isLoading: false,
  error: null,
  isOnboarded: false,
};

// Async thunks
export const fetchProfile = createAsyncThunk(
  'merchant/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await merchantAPI.getProfile();
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch profile'));
    }
  }
);

export const updateProfile = createAsyncThunk(
  'merchant/updateProfile',
  async (data: Partial<MerchantProfile>, { rejectWithValue }) => {
    try {
      const response = await merchantAPI.updateProfile(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to update profile'));
    }
  }
);

export const fetchDashboard = createAsyncThunk(
  'merchant/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await merchantAPI.getDashboard();
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch dashboard'));
    }
  }
);

export const setTransactionPIN = createAsyncThunk(
  'merchant/setTransactionPIN',
  async (pin: string, { rejectWithValue }) => {
    try {
      await merchantAPI.setPin(pin);
      return true;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to set PIN'));
    }
  }
);

const merchantSlice = createSlice({
  name: 'merchant',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setOnboarded: (state, action: PayloadAction<boolean>) => {
      state.isOnboarded = action.payload;
    },
    clearMerchant: (state) => {
      state.profile = null;
      state.dashboard = null;
      state.isOnboarded = false;
    },
  },
  extraReducers: (builder) => {
    // Fetch Profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
        // Check if onboarded (has name and UPI ID)
        state.isOnboarded = !!(action.payload.name && action.payload.upiId);
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
        state.isOnboarded = !!(action.payload.name && action.payload.upiId);
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Dashboard
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setOnboarded, clearMerchant } = merchantSlice.actions;
export default merchantSlice.reducer;
