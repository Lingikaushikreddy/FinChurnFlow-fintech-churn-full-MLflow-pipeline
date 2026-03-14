/**
 * Products Slice - Manages product catalog
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { storeAPI } from '../../services/api';
import { extractErrorMessage } from '../../utils/errorUtils';

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  categoryId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface ProductsState {
  items: Product[];
  categories: Category[];
  selectedCategory: string | null;
  total: number;
  page: number;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
}

const initialState: ProductsState = {
  items: [],
  categories: [],
  selectedCategory: null,
  total: 0,
  page: 1,
  isLoading: false,
  error: null,
  searchQuery: '',
};

// Async thunks
export const fetchProducts = createAsyncThunk(
  'products/fetch',
  async (
    { page = 1, search = '', categoryId }: { page?: number; search?: string; categoryId?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await storeAPI.listProducts({ page, search, category_id: categoryId });
      return { ...response, page };
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch products'));
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await storeAPI.listCategories();
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch categories'));
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/create',
  async (
    data: {
      name: string;
      description?: string;
      price: number;
      stock?: number;
      category_id?: string;
      images?: string[];
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await storeAPI.createProduct(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to create product'));
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/update',
  async (
    { id, data }: { id: string; data: Partial<Product> },
    { rejectWithValue }
  ) => {
    try {
      const response = await storeAPI.updateProduct(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to update product'));
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await storeAPI.deleteProduct(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to delete product'));
    }
  }
);

export const createCategory = createAsyncThunk(
  'products/createCategory',
  async (data: { name: string; parent_id?: string }, { rejectWithValue }) => {
    try {
      const response = await storeAPI.createCategory(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to create category'));
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
    },
    clearProducts: (state) => {
      state.items = [];
      state.page = 1;
      state.total = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.page === 1) {
          state.items = action.payload.items;
        } else {
          state.items = [...state.items, ...action.payload.items];
        }
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Categories
    builder
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      });

    // Create Product
    builder
      .addCase(createProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Product
    builder
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.items.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });

    // Delete Product
    builder
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload);
        state.total -= 1;
      });

    // Create Category
    builder
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
      });
  },
});

export const { setSearchQuery, setSelectedCategory, clearProducts, clearError } = productsSlice.actions;
export default productsSlice.reducer;
