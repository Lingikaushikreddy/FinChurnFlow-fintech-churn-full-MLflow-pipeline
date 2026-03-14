/**
 * Contacts Slice - Manages beneficiary contacts
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { contactsAPI } from '../../services/api';
import { extractErrorMessage } from '../../utils/errorUtils';

interface Contact {
  id: string;
  merchantId: string;
  name: string;
  phone: string | null;
  upiId: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  isVerified: boolean;
  createdAt: string;
}

interface ContactsState {
  items: Contact[];
  recentContacts: Contact[];
  total: number;
  page: number;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
}

const initialState: ContactsState = {
  items: [],
  recentContacts: [],
  total: 0,
  page: 1,
  isLoading: false,
  error: null,
  searchQuery: '',
};

// Async thunks
export const fetchContacts = createAsyncThunk(
  'contacts/fetch',
  async (
    { page = 1, search = '' }: { page?: number; search?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await contactsAPI.list({ page, search });
      return { ...response, page };
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch contacts'));
    }
  }
);

export const fetchRecentContacts = createAsyncThunk(
  'contacts/fetchRecent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await contactsAPI.getRecent();
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch recent contacts'));
    }
  }
);

export const createContact = createAsyncThunk(
  'contacts/create',
  async (data: Partial<Contact>, { rejectWithValue }) => {
    try {
      const response = await contactsAPI.create(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to create contact'));
    }
  }
);

export const updateContact = createAsyncThunk(
  'contacts/update',
  async ({ id, data }: { id: string; data: Partial<Contact> }, { rejectWithValue }) => {
    try {
      const response = await contactsAPI.update(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to update contact'));
    }
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await contactsAPI.delete(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to delete contact'));
    }
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    clearContacts: (state) => {
      state.items = [];
      state.recentContacts = [];
      state.page = 1;
      state.total = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Contacts
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.page === 1) {
          state.items = action.payload.items;
        } else {
          state.items = [...state.items, ...action.payload.items];
        }
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Recent Contacts
    builder
      .addCase(fetchRecentContacts.fulfilled, (state, action) => {
        state.recentContacts = action.payload;
      });

    // Create Contact
    builder
      .addCase(createContact.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createContact.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Contact
    builder
      .addCase(updateContact.fulfilled, (state, action) => {
        const index = state.items.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });

    // Delete Contact
    builder
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload);
        state.total -= 1;
      });
  },
});

export const { setSearchQuery, clearContacts, clearError } = contactsSlice.actions;
export default contactsSlice.reducer;
