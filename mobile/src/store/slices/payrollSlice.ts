/**
 * Payroll Slice - Manages salary processing and payroll operations
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { payrollAPI } from '../../services/api';
import { extractErrorMessage } from '../../utils/errorUtils';

export interface SalaryPayment {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paidAt: string | null;
  month: number;
  year: number;
  createdAt: string;
}

export interface PayrollSummary {
  totalEmployees: number;
  activeEmployees: number;
  totalMonthlyPayroll: number;
  pendingAdvances: number;
  nextPayDay: string | null;
}

interface PayrollState {
  salaryHistory: SalaryPayment[];
  summary: PayrollSummary | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  lastProcessedBatch: string[];
}

const initialState: PayrollState = {
  salaryHistory: [],
  summary: null,
  isLoading: false,
  isProcessing: false,
  error: null,
  lastProcessedBatch: [],
};

// Async thunks
export const fetchPayrollSummary = createAsyncThunk(
  'payroll/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await payrollAPI.getPayrollSummary();
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch payroll summary'));
    }
  }
);

export const fetchSalaryHistory = createAsyncThunk(
  'payroll/fetchHistory',
  async (
    { employeeId, page = 1 }: { employeeId?: string; page?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await payrollAPI.getSalaryHistory({ employee_id: employeeId, page });
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch salary history'));
    }
  }
);

export const processSalary = createAsyncThunk(
  'payroll/process',
  async (
    data: { employee_ids: string[]; pin: string; month?: number; year?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await payrollAPI.processSalary(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to process salary'));
    }
  }
);

const payrollSlice = createSlice({
  name: 'payroll',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearLastBatch: (state) => {
      state.lastProcessedBatch = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch Summary
    builder
      .addCase(fetchPayrollSummary.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPayrollSummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.summary = action.payload;
      })
      .addCase(fetchPayrollSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch History
    builder
      .addCase(fetchSalaryHistory.fulfilled, (state, action) => {
        state.salaryHistory = action.payload.items || action.payload;
      });

    // Process Salary
    builder
      .addCase(processSalary.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(processSalary.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.lastProcessedBatch = action.payload.processed_ids || [];
        if (action.payload.payments) {
          state.salaryHistory = [...action.payload.payments, ...state.salaryHistory];
        }
      })
      .addCase(processSalary.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearLastBatch } = payrollSlice.actions;
export default payrollSlice.reducer;
