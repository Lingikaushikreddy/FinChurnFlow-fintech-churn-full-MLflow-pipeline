/**
 * Toast Component
 * Global toast/snackbar notifications with queue support
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { colors, spacing, shadows } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Toast position
export type ToastPosition = 'top' | 'bottom';

// Toast configuration
export interface ToastConfig {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  position?: ToastPosition;
  action?: {
    label: string;
    onPress: () => void;
  };
  onDismiss?: () => void;
}

// Internal toast with id
interface InternalToast extends ToastConfig {
  id: string;
}

// Toast context type
interface ToastContextType {
  show: (config: ToastConfig) => string;
  hide: (id: string) => void;
  hideAll: () => void;
  success: (message: string, options?: Partial<ToastConfig>) => string;
  error: (message: string, options?: Partial<ToastConfig>) => string;
  warning: (message: string, options?: Partial<ToastConfig>) => string;
  info: (message: string, options?: Partial<ToastConfig>) => string;
}

// Create context
const ToastContext = createContext<ToastContextType | null>(null);

// Type configurations
const typeConfig: Record<ToastType, { icon: string; color: string; bgColor: string }> = {
  success: {
    icon: 'check-circle',
    color: colors.success,
    bgColor: colors.successLight || '#D1FAE5',
  },
  error: {
    icon: 'alert-circle',
    color: colors.error,
    bgColor: colors.errorLight || '#FEE2E2',
  },
  warning: {
    icon: 'alert',
    color: colors.warning,
    bgColor: colors.warningLight || '#FEF3C7',
  },
  info: {
    icon: 'information',
    color: colors.info || colors.primary,
    bgColor: colors.infoLight || '#DBEAFE',
  },
};

// Single toast component
const ToastItem: React.FC<{
  toast: InternalToast;
  onDismiss: () => void;
  position: ToastPosition;
}> = ({ toast, onDismiss, position }) => {
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const config = typeConfig[toast.type || 'info'];

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        animateOut();
      }, toast.duration || 4000);

      return () => clearTimeout(timer);
    }
  }, []);

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
      toast.onDismiss?.();
    });
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: config.bgColor },
        shadows.md,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.toastContent}>
        <IconButton
          icon={config.icon}
          iconColor={config.color}
          size={24}
          style={styles.toastIcon}
        />
        <View style={styles.toastTextContainer}>
          {toast.title && (
            <Text style={[styles.toastTitle, { color: config.color }]}>
              {toast.title}
            </Text>
          )}
          <Text style={styles.toastMessage} numberOfLines={3}>
            {toast.message}
          </Text>
        </View>
        {toast.action && (
          <TouchableOpacity
            onPress={() => {
              toast.action!.onPress();
              animateOut();
            }}
            style={styles.actionButton}
          >
            <Text style={[styles.actionText, { color: config.color }]}>
              {toast.action.label}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={animateOut} style={styles.closeButton}>
          <IconButton
            icon="close"
            iconColor={colors.gray500}
            size={18}
            style={styles.closeIcon}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Toast provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<InternalToast[]>([]);
  const toastIdCounter = useRef(0);

  const generateId = useCallback(() => {
    toastIdCounter.current += 1;
    return `toast-${toastIdCounter.current}-${Date.now()}`;
  }, []);

  const show = useCallback((config: ToastConfig): string => {
    const id = config.id || generateId();
    const toast: InternalToast = {
      ...config,
      id,
      type: config.type || 'info',
      position: config.position || 'bottom',
      duration: config.duration ?? 4000,
    };

    setToasts((prev) => {
      // Remove duplicate if same id exists
      const filtered = prev.filter((t) => t.id !== id);
      // Limit to 3 toasts max
      const limited = filtered.slice(-2);
      return [...limited, toast];
    });

    return id;
  }, [generateId]);

  const hide = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const hideAll = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback(
    (message: string, options?: Partial<ToastConfig>) =>
      show({ ...options, message, type: 'success' }),
    [show]
  );

  const error = useCallback(
    (message: string, options?: Partial<ToastConfig>) =>
      show({ ...options, message, type: 'error' }),
    [show]
  );

  const warning = useCallback(
    (message: string, options?: Partial<ToastConfig>) =>
      show({ ...options, message, type: 'warning' }),
    [show]
  );

  const info = useCallback(
    (message: string, options?: Partial<ToastConfig>) =>
      show({ ...options, message, type: 'info' }),
    [show]
  );

  const topToasts = toasts.filter((t) => t.position === 'top');
  const bottomToasts = toasts.filter((t) => t.position === 'bottom');

  return (
    <ToastContext.Provider value={{ show, hide, hideAll, success, error, warning, info }}>
      {children}

      {/* Top toasts */}
      {topToasts.length > 0 && (
        <View style={[styles.container, styles.containerTop]}>
          {topToasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => hide(toast.id)}
              position="top"
            />
          ))}
        </View>
      )}

      {/* Bottom toasts */}
      {bottomToasts.length > 0 && (
        <View style={[styles.container, styles.containerBottom]}>
          {bottomToasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => hide(toast.id)}
              position="bottom"
            />
          ))}
        </View>
      )}
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    elevation: 999,
  },
  containerTop: {
    top: 60,
  },
  containerBottom: {
    bottom: 100,
  },
  toast: {
    marginBottom: spacing.sm,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingRight: spacing.xs,
  },
  toastIcon: {
    margin: 0,
  },
  toastTextContainer: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: spacing.xs,
  },
  closeIcon: {
    margin: 0,
  },
});

export default {
  ToastProvider,
  useToast,
};
