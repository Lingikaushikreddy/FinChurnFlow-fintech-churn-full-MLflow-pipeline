/**
 * Razorpay Nano - Main App Entry Point
 * Robust app setup with all necessary providers and error handling
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox, Platform } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { store, persistor } from './src/store';
import Navigation from './src/navigation';
import { theme, colors } from './src/theme';
import {
  ErrorBoundary,
  ToastProvider,
  NetworkStatusBanner,
  SyncStatusBar,
  DashboardSkeleton,
} from './src/components';
import { analytics } from './src/utils/analytics';
import './src/i18n';

// Ignore specific warnings in development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Sending `onAnimatedValueUpdate` with no listeners registered',
    'ViewPropTypes will be removed from React Native',
  ]);
}

// App initialization
const initializeApp = async () => {
  try {
    // Seed dev auth token into AsyncStorage so API interceptors can use it
    if (__DEV__) {
      await AsyncStorage.setItem(
        'accessToken',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJleHAiOjE4MDQ3OTQ1MDAsInR5cGUiOiJhY2Nlc3MifQ.6qldapJ68q72Bv6KZoBsgN-Vw9Rug40Wmed_eGA-zN0',
      );
    }

    // Initialize analytics
    await analytics.initialize();

    // Track app startup
    analytics.track('app_startup', {
      platform: Platform.OS,
      version: '1.0.0',
    });

    console.log('[App] Initialized successfully');
  } catch (error) {
    console.error('[App] Initialization failed:', error);
  }
};

// Loading component for PersistGate
const LoadingView = () => (
  <SafeAreaProvider>
    <DashboardSkeleton />
  </SafeAreaProvider>
);

const App: React.FC = () => {
  useEffect(() => {
    initializeApp();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Provider store={store}>
          <PersistGate loading={<LoadingView />} persistor={persistor}>
            <PaperProvider theme={theme}>
              <SafeAreaProvider>
                <ToastProvider>
                  <StatusBar
                    barStyle="dark-content"
                    backgroundColor={colors.background}
                    translucent={Platform.OS === 'android'}
                  />

                  {/* Main Navigation */}
                  <Navigation />

                  {/* Global Status Banners */}
                  <NetworkStatusBanner showWhenOnline />
                  <SyncStatusBar />
                </ToastProvider>
              </SafeAreaProvider>
            </PaperProvider>
          </PersistGate>
        </Provider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
};

export default App;
