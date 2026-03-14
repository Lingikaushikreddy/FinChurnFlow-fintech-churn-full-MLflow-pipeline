/**
 * Analytics & Crash Reporting Utilities
 * Track events, user behavior, and errors
 */

import { Platform } from 'react-native';
// import analytics from '@react-native-firebase/analytics';
// import crashlytics from '@react-native-firebase/crashlytics';

// Event categories
export enum EventCategory {
  AUTH = 'auth',
  PAYMENT = 'payment',
  PAYOUT = 'payout',
  STORE = 'store',
  PAYROLL = 'payroll',
  AI = 'ai',
  NAVIGATION = 'navigation',
  ERROR = 'error',
  PERFORMANCE = 'performance',
}

// Standard event names
export const Events = {
  // Auth events
  LOGIN_STARTED: 'login_started',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  OTP_REQUESTED: 'otp_requested',
  OTP_VERIFIED: 'otp_verified',
  OTP_FAILED: 'otp_failed',

  // Payment events
  QR_VIEWED: 'qr_viewed',
  QR_SHARED: 'qr_shared',
  QR_DOWNLOADED: 'qr_downloaded',
  PAYMENT_LINK_CREATED: 'payment_link_created',
  PAYMENT_LINK_SHARED: 'payment_link_shared',
  PAYMENT_RECEIVED: 'payment_received',

  // Payout events
  PAYOUT_INITIATED: 'payout_initiated',
  PAYOUT_SUCCESS: 'payout_success',
  PAYOUT_FAILED: 'payout_failed',
  CONTACT_ADDED: 'contact_added',
  CONTACT_DELETED: 'contact_deleted',

  // Store events
  PRODUCT_ADDED: 'product_added',
  PRODUCT_UPDATED: 'product_updated',
  PRODUCT_DELETED: 'product_deleted',
  CATALOG_VIEWED: 'catalog_viewed',
  CATALOG_SHARED: 'catalog_shared',
  ORDER_RECEIVED: 'order_received',
  ORDER_STATUS_UPDATED: 'order_status_updated',

  // Payroll events
  EMPLOYEE_ADDED: 'employee_added',
  EMPLOYEE_UPDATED: 'employee_updated',
  EMPLOYEE_DELETED: 'employee_deleted',
  SALARY_PROCESSED: 'salary_processed',
  ADVANCE_GIVEN: 'advance_given',

  // AI events
  AI_CHAT_STARTED: 'ai_chat_started',
  AI_MESSAGE_SENT: 'ai_message_sent',
  AI_VOICE_USED: 'ai_voice_used',
  AI_SUGGESTION_TAPPED: 'ai_suggestion_tapped',
  AI_ACTION_EXECUTED: 'ai_action_executed',

  // Navigation events
  SCREEN_VIEW: 'screen_view',
  BUTTON_CLICK: 'button_click',
  TAB_CHANGE: 'tab_change',

  // Error events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  VALIDATION_ERROR: 'validation_error',

  // Performance events
  APP_STARTUP: 'app_startup',
  SCREEN_LOAD_TIME: 'screen_load_time',
  API_RESPONSE_TIME: 'api_response_time',
};

// User properties
export interface UserProperties {
  userId?: string;
  phone?: string;
  businessName?: string;
  kycStatus?: string;
  language?: string;
  appVersion?: string;
  platform?: string;
}

// Event parameters
export interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

// Analytics service class
class AnalyticsService {
  private isEnabled = true;
  private userId: string | null = null;
  private sessionId: string;
  private sessionStartTime: number;
  private eventQueue: Array<{ name: string; params: EventParams; timestamp: number }> = [];
  private isInitialized = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize analytics
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Enable analytics collection
      // await analytics().setAnalyticsCollectionEnabled(true);
      // await crashlytics().setCrashlyticsCollectionEnabled(true);

      this.isInitialized = true;

      // Process queued events
      await this.processEventQueue();

      console.log('[Analytics] Initialized successfully');
    } catch (error) {
      console.error('[Analytics] Initialization failed:', error);
    }
  }

  /**
   * Set user identity
   */
  async setUser(userId: string, properties?: UserProperties): Promise<void> {
    this.userId = userId;

    try {
      // await analytics().setUserId(userId);
      // await crashlytics().setUserId(userId);

      if (properties) {
        await this.setUserProperties(properties);
      }

      console.log('[Analytics] User set:', userId);
    } catch (error) {
      console.error('[Analytics] Failed to set user:', error);
    }
  }

  /**
   * Set user properties
   */
  async setUserProperties(properties: UserProperties): Promise<void> {
    try {
      const flatProperties: Record<string, string> = {};

      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          flatProperties[key] = String(value);
        }
      });

      // await analytics().setUserProperties(flatProperties);

      // Set crashlytics attributes
      // for (const [key, value] of Object.entries(flatProperties)) {
      //   await crashlytics().setAttribute(key, value);
      // }

      console.log('[Analytics] User properties set:', flatProperties);
    } catch (error) {
      console.error('[Analytics] Failed to set user properties:', error);
    }
  }

  /**
   * Clear user identity (on logout)
   */
  async clearUser(): Promise<void> {
    this.userId = null;

    try {
      // await analytics().setUserId(null);
      console.log('[Analytics] User cleared');
    } catch (error) {
      console.error('[Analytics] Failed to clear user:', error);
    }
  }

  /**
   * Track an event
   */
  async track(eventName: string, params: EventParams = {}): Promise<void> {
    if (!this.isEnabled) return;

    const enrichedParams: EventParams = {
      ...params,
      session_id: this.sessionId,
      session_duration: Math.round((Date.now() - this.sessionStartTime) / 1000),
      platform: Platform.OS,
      timestamp: Date.now(),
    };

    if (!this.isInitialized) {
      // Queue event for later
      this.eventQueue.push({
        name: eventName,
        params: enrichedParams,
        timestamp: Date.now(),
      });
      return;
    }

    try {
      // await analytics().logEvent(eventName, enrichedParams);

      if (__DEV__) {
        console.log(`[Analytics] Event: ${eventName}`, enrichedParams);
      }
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
    }
  }

  /**
   * Track screen view
   */
  async trackScreen(screenName: string, screenClass?: string): Promise<void> {
    try {
      // await analytics().logScreenView({
      //   screen_name: screenName,
      //   screen_class: screenClass || screenName,
      // });

      if (__DEV__) {
        console.log(`[Analytics] Screen: ${screenName}`);
      }
    } catch (error) {
      console.error('[Analytics] Failed to track screen:', error);
    }
  }

  /**
   * Track error
   */
  async trackError(
    error: Error,
    context?: Record<string, string>,
    fatal = false
  ): Promise<void> {
    try {
      // Log to crashlytics
      // if (context) {
      //   for (const [key, value] of Object.entries(context)) {
      //     await crashlytics().setAttribute(key, value);
      //   }
      // }

      // await crashlytics().recordError(error);

      // Also track as analytics event
      await this.track(Events.ERROR_OCCURRED, {
        error_name: error.name,
        error_message: error.message,
        fatal: fatal,
        ...context,
      });

      if (__DEV__) {
        console.error('[Analytics] Error tracked:', error.message, context);
      }
    } catch (err) {
      console.error('[Analytics] Failed to track error:', err);
    }
  }

  /**
   * Track API error
   */
  async trackApiError(
    endpoint: string,
    status: number,
    message: string,
    duration?: number
  ): Promise<void> {
    await this.track(Events.API_ERROR, {
      endpoint,
      status,
      message,
      duration,
    });
  }

  /**
   * Track performance metric
   */
  async trackPerformance(
    metricName: string,
    durationMs: number,
    attributes?: Record<string, string>
  ): Promise<void> {
    await this.track(Events.SCREEN_LOAD_TIME, {
      metric_name: metricName,
      duration_ms: durationMs,
      ...attributes,
    });
  }

  /**
   * Log a message for debugging (crashlytics only)
   */
  log(message: string): void {
    // crashlytics().log(message);

    if (__DEV__) {
      console.log(`[Analytics] Log: ${message}`);
    }
  }

  /**
   * Process queued events
   */
  private async processEventQueue(): Promise<void> {
    const queue = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of queue) {
      await this.track(event.name, event.params);
    }
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    // analytics().setAnalyticsCollectionEnabled(enabled);
    // crashlytics().setCrashlyticsCollectionEnabled(enabled);
  }

  /**
   * Start a new session
   */
  startNewSession(): void {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
  }

  /**
   * Get current session info
   */
  getSessionInfo(): { sessionId: string; duration: number } {
    return {
      sessionId: this.sessionId,
      duration: Math.round((Date.now() - this.sessionStartTime) / 1000),
    };
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Convenience methods
export const trackEvent = (name: string, params?: EventParams) => analytics.track(name, params);
export const trackScreen = (name: string) => analytics.trackScreen(name);
export const trackError = (error: Error, context?: Record<string, string>) =>
  analytics.trackError(error, context);

// React hook for screen tracking
export function useScreenTracking(screenName: string): void {
  // Track on mount
  analytics.trackScreen(screenName);
}

// Performance tracking helper
export function createPerformanceTracker(name: string) {
  const startTime = Date.now();

  return {
    end: (attributes?: Record<string, string>) => {
      const duration = Date.now() - startTime;
      analytics.trackPerformance(name, duration, attributes);
      return duration;
    },
  };
}

// Timing decorator for async functions
export function withTiming<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  metricName: string
): T {
  return (async (...args: Parameters<T>) => {
    const tracker = createPerformanceTracker(metricName);
    try {
      const result = await fn(...args);
      tracker.end({ success: 'true' });
      return result;
    } catch (error) {
      tracker.end({ success: 'false', error: (error as Error).message });
      throw error;
    }
  }) as T;
}

export default analytics;
