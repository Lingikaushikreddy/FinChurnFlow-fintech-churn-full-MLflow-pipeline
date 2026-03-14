/**
 * Redux Store Configuration
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  createMigrate,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import merchantReducer from './slices/merchantSlice';
import transactionsReducer from './slices/transactionsSlice';
import contactsReducer from './slices/contactsSlice';
import productsReducer from './slices/productsSlice';
import ordersReducer from './slices/ordersSlice';
import employeesReducer from './slices/employeesSlice';
import payrollReducer from './slices/payrollSlice';
import aiReducer from './slices/aiSlice';

// Development mode - set to true to bypass authentication for testing
const DEV_MODE = __DEV__; // Auto-bypass login in dev builds

// Migrations: sanitize persisted state when version changes
const migrations: any = {
  2: (state: any) => {
    // v2: strip any non-string error objects from persisted auth/merchant state
    return {
      ...state,
      auth: state?.auth ? { ...state.auth, error: null } : undefined,
      merchant: state?.merchant ? { ...state.merchant, error: null } : undefined,
    };
  },
};

// Persist configuration
const persistConfig = {
  key: 'root',
  version: 2,
  storage: AsyncStorage,
  whitelist: DEV_MODE ? [] : ['auth', 'merchant'],
  migrate: createMigrate(migrations, { debug: __DEV__ }),
};

// Combine reducers
const rootReducer = combineReducers({
  auth: authReducer,
  merchant: merchantReducer,
  transactions: transactionsReducer,
  contacts: contactsReducer,
  products: productsReducer,
  orders: ordersReducer,
  employees: employeesReducer,
  payroll: payrollReducer,
  ai: aiReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Development preloaded state for testing Quick Actions
const devPreloadedState = DEV_MODE ? {
  auth: {
    isAuthenticated: true,
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJleHAiOjE4MDQ3OTQ1MDAsInR5cGUiOiJhY2Nlc3MifQ.6qldapJ68q72Bv6KZoBsgN-Vw9Rug40Wmed_eGA-zN0',
    refreshToken: 'dev-refresh-token-12345',
    isLoading: false,
    error: null,
    otpSent: false,
    phone: '9876543210',
  },
  merchant: {
    profile: {
      id: 'a0000000-0000-0000-0000-000000000001',
      phone: '9876543210',
      name: 'Test Merchant',
      businessName: 'Test Kirana Store',
      upiId: 'testmerchant@upi',
      kycStatus: 'verified',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    dashboard: {
      todayCollection: 15000,
      todayPayouts: 3500,
      todayTransactions: 12,
      pendingPayouts: 2,
      totalBalance: 45000,
      weekCollection: 85000,
      weekGrowthPercent: 12,
    },
    isLoading: false,
    error: null,
    isOnboarded: true,
  },
} : undefined;

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  preloadedState: devPreloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
