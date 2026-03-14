/**
 * Razorpay Nano - Main App Component
 * Robust app setup with all necessary providers and error handling
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox, Platform, ActivityIndicator, View } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { store, persistor } from './store';
import Navigation from './navigation';
import { theme, colors } from './theme';
import { ErrorBoundary, ToastProvider, NetworkStatusBanner, SyncStatusBar } from './components';
import { analytics } from './utils/analytics';
import './i18n';

// Ignore specific warnings in development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Sending `onAnimatedValueUpdate` with no listeners registered',
  ]);
}

// App initialization
const initializeApp = async () => {
  try {
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

// Main App component
const App: React.FC = () => {
  useEffect(() => {
    initializeApp();
  }, []);

  // Loading component for PersistGate
  const renderLoading = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ReduxProvider store={store}>
          <PersistGate loading={renderLoading()} persistor={persistor}>
            <PaperProvider theme={theme}>
              <SafeAreaProvider>
                <ToastProvider>
                  <StatusBar
                    barStyle="dark-content"
                    backgroundColor="transparent"
                    translucent
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
        </ReduxProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
};

export default App;
