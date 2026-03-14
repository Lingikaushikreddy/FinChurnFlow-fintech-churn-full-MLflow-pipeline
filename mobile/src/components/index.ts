/**
 * Components barrel export
 */

// UI Components
export * from './ui';

// Feature Components
export { default as AmountInput } from './AmountInput';
export { default as TransactionItem } from './TransactionItem';
export type { Transaction } from './TransactionItem';
export { default as QRDisplay } from './QRDisplay';
export { default as ContactPicker } from './ContactPicker';
export type { Contact } from './ContactPicker';

// Voice & AI Components
export { default as VoiceButton } from './VoiceButton';
export { default as VoiceWaveform } from './VoiceWaveform';
export { default as ChatMessage } from './ChatMessage';
export type { AIAction } from './ChatMessage';

// Sync Components
export { default as SyncStatusBar } from './SyncStatusBar';

// Gamification Components
export { default as AchievementBadge, ACHIEVEMENTS } from './AchievementBadge';
export type { Achievement } from './AchievementBadge';
export { default as StreakCounter } from './StreakCounter';

// Error Handling Components
export { ErrorBoundary } from './ErrorBoundary';

// Loading Components
export {
  Skeleton,
  TransactionSkeleton,
  TransactionListSkeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  ContactSkeleton,
  ContactListSkeleton,
  DashboardSkeleton,
  ChatSkeleton,
  OrderSkeleton,
  OrderListSkeleton,
  ChartSkeleton,
  FormSkeleton,
  FullScreenSkeleton,
} from './SkeletonLoader';

// Network Components
export { default as NetworkStatusBanner } from './NetworkStatusBanner';

// Toast/Notification Components
export { ToastProvider, useToast } from './Toast';
export type { ToastConfig, ToastType, ToastPosition } from './Toast';
