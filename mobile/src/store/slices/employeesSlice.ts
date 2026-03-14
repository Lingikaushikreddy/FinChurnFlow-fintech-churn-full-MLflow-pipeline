/**
 * Employees Slice - Manages employee data for payroll
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { payrollAPI } from '../../services/api';
import { extractErrorMessage } from '../../utils/errorUtils';

export interface Employee {
  id: string;
  merchantId: string;
  name: string;
  phone: string | null;
  upiId: string | null;
  salary: number;
  payDay: number;
  isActive: boolean;
  createdAt: string;
}

export interface Advance {
  id: string;
  employeeId: string;
  amount: number;
  description: string | null;
  deducted: boolean;
  createdAt: string;
}

interface EmployeesState {
  items: Employee[];
  total: number;
  page: number;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedEmployees: string[];
}

const initialState: EmployeesState = {
  items: [],
  total: 0,
  page: 1,
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedEmployees: [],
};

// Async thunks
export const fetchEmployees = createAsyncThunk(
  'employees/fetch',
  async (
    { page = 1, search = '', isActive }: { page?: number; search?: string; isActive?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await payrollAPI.listEmployees({ page, search, is_active: isActive });
      return { ...response, page };
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch employees'));
    }
  }
);

export const createEmployee = createAsyncThunk(
  'employees/create',
  async (
    data: {
      name: string;
      phone?: string;
      upi_id?: string;
      salary: number;
      pay_day?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await payrollAPI.createEmployee(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to add employee'));
    }
  }
);

export const updateEmployee = createAsyncThunk(
  'employees/update',
  async (
    { id, data }: { id: string; data: Partial<Employee> },
    { rejectWithValue }
  ) => {
    try {
      const response = await payrollAPI.updateEmployee(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to update employee'));
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  'employees/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await payrollAPI.deleteEmployee(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to delete employee'));
    }
  }
);

export const recordAdvance = createAsyncThunk(
  'employees/recordAdvance',
  async (
    data: { employee_id: string; amount: number; description?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await payrollAPI.recordAdvance(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to record advance'));
    }
  }
);

const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    toggleEmployeeSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedEmployees.indexOf(action.payload);
      if (index === -1) {
        state.selectedEmployees.push(action.payload);
      } else {
        state.selectedEmployees.splice(index, 1);
      }
    },
    selectAllEmployees: (state) => {
      state.selectedEmployees = state.items.filter(e => e.isActive).map(e => e.id);
    },
    clearSelection: (state) => {
      state.selectedEmployees = [];
    },
    clearEmployees: (state) => {
      state.items = [];
      state.page = 1;
      state.total = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Employees
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.page === 1) {
          state.items = action.payload.items;
        } else {
          state.items = [...state.items, ...action.payload.items];
        }
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Employee
    builder
      .addCase(createEmployee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Employee
    builder
      .addCase(updateEmployee.fulfilled, (state, action) => {
        const index = state.items.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });

    // Delete Employee
    builder
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.items = state.items.filter((e) => e.id !== action.payload);
        state.total -= 1;
        state.selectedEmployees = state.selectedEmployees.filter(id => id !== action.payload);
      });
  },
});

export const {
  setSearchQuery,
  toggleEmployeeSelection,
  selectAllEmployees,
  clearSelection,
  clearEmployees,
  clearError,
} = employeesSlice.actions;
export default employeesSlice.reducer;
