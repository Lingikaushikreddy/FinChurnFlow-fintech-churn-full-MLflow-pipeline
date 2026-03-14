/**
 * ErrorBoundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { colors, spacing, shadows } from '../theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to crash reporting service
    this.logErrorToService(error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset error state when resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo): void => {
    // TODO: Integrate with crash reporting service (Sentry, Crashlytics, etc.)
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Example: Send to analytics
    // analytics.logError({
    //   error: error.message,
    //   stack: error.stack,
    //   componentStack: errorInfo.componentStack,
    // });
  };

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Surface style={[styles.card, shadows.md]}>
              <Text style={styles.emoji}>😔</Text>
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.message}>
                We're sorry for the inconvenience. Please try again or restart the app.
              </Text>

              {__DEV__ && this.state.error && (
                <View style={styles.debugContainer}>
                  <Text style={styles.debugTitle}>Debug Info:</Text>
                  <Text style={styles.debugText}>{this.state.error.toString()}</Text>
                  {this.state.errorInfo && (
                    <Text style={styles.debugStack} numberOfLines={10}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.actions}>
                <Button
                  mode="contained"
                  onPress={this.resetError}
                  style={styles.button}
                >
                  Try Again
                </Button>
              </View>
            </Surface>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    padding: spacing.xl,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  debugContainer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.gray100,
    borderRadius: 8,
    width: '100%',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.xs,
  },
  debugText: {
    fontSize: 11,
    color: colors.error,
    fontFamily: 'monospace',
  },
  debugStack: {
    fontSize: 10,
    color: colors.gray600,
    fontFamily: 'monospace',
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: spacing.xl,
    width: '100%',
  },
  button: {
    borderRadius: 8,
  },
});

export default ErrorBoundary;
