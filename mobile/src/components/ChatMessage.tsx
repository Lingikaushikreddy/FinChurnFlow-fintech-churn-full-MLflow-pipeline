/**
 * ChatMessage - Chat bubble component for AI conversations
 * 
 * Phase 1: Supports action buttons for show_qr, create_payment_link, check_balance
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, shadows } from '../theme';

// AI Action interface matching backend format
export interface AIAction {
  type: 'navigate' | 'action' | 'share' | 'call' | 'whatsapp';
  screen?: string;
  action?: string;
  params?: Record<string, any>;
  label: string;
  confirm?: boolean;
  // Legacy fields
  data?: any;
  status?: 'pending' | 'completed' | 'failed';
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  action?: AIAction;
  isLoading?: boolean;
  onActionPress?: (action: AIAction) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  timestamp,
  action,
  isLoading = false,
  onActionPress,
}) => {
  const isUser = role === 'user';
  const [actionExecuting, setActionExecuting] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);

  // Get icon for action based on screen or action type
  const getActionIcon = (): string => {
    if (!action) return 'robot';

    // Map by screen name (Phase 1)
    const screenIconMap: Record<string, string> = {
      'QRCode': 'qrcode',
      'CreateLink': 'link-plus',
      'Dashboard': 'view-dashboard',
      'SendMoney': 'send',
      'Contacts': 'account-multiple',
      'AddProduct': 'package-variant-plus',
      'Products': 'package-variant',
      'Payroll': 'cash-multiple',
      'Reports': 'chart-bar',
    };

    // Map by action name
    const actionIconMap: Record<string, string> = {
      'create_payment_link': 'link-plus',
      'send_payout': 'send',
      'add_product': 'package-variant-plus',
      'add_credit': 'book-plus-outline',
      'create_and_share_whatsapp': 'whatsapp',
      'share_whatsapp': 'whatsapp',
    };

    if (action.screen && screenIconMap[action.screen]) {
      return screenIconMap[action.screen];
    }
    if (action.action && actionIconMap[action.action]) {
      return actionIconMap[action.action];
    }

    return 'arrow-right-circle';
  };

  const getStatusColor = (): string => {
    if (actionCompleted) return colors.success;
    if (action?.status === 'completed') return colors.success;
    if (action?.status === 'failed') return colors.error;
    return colors.primary;
  };

  const formatTime = (ts?: string): string => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleActionPress = async () => {
    if (!action || !onActionPress || actionExecuting) return;

    setActionExecuting(true);
    try {
      await onActionPress(action);
      setActionCompleted(true);
    } catch (error) {
      console.error('Action error:', error);
    } finally {
      setActionExecuting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.assistantContainer]}>
        <Surface style={[styles.bubble, styles.assistantBubble]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        </Surface>
      </View>
    );
  }

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {/* Avatar for assistant */}
      {!isUser && (
        <View style={styles.avatar}>
          <Icon name="robot" size={20} color={colors.primary} />
        </View>
      )}

      <View style={styles.messageWrapper}>
        <Surface style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.content, isUser && styles.userContent]}>{content}</Text>

          {/* Action button - Phase 1 */}
          {action && action.label && !isUser && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                actionCompleted && styles.actionButtonCompleted,
              ]}
              onPress={handleActionPress}
              disabled={actionExecuting || actionCompleted}
              activeOpacity={0.7}
            >
              {actionExecuting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Icon
                    name={actionCompleted ? 'check-circle' : getActionIcon()}
                    size={18}
                    color={colors.white}
                    style={styles.actionIcon}
                  />
                  <Text style={styles.actionButtonText}>
                    {actionCompleted ? 'Done!' : action.label}
                  </Text>
                  {!actionCompleted && (
                    <Icon
                      name="chevron-right"
                      size={18}
                      color={colors.white}
                      style={styles.actionChevron}
                    />
                  )}
                </>
              )}
            </TouchableOpacity>
          )}
        </Surface>

        {/* Timestamp */}
        {timestamp && (
          <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
            {formatTime(timestamp)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  messageWrapper: {
    maxWidth: '80%',
  },
  bubble: {
    padding: spacing.md,
    borderRadius: 16,
    ...shadows.sm,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  userContent: {
    color: colors.textInverse,
  },
  // Action Button - Phase 1
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    marginTop: spacing.md,
    minHeight: 40,
  },
  actionButtonCompleted: {
    backgroundColor: colors.success,
  },
  actionIcon: {
    marginRight: spacing.xs,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  actionChevron: {
    marginLeft: spacing.xs,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  userTimestamp: {
    textAlign: 'right',
    marginRight: spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
  },
});

export default ChatMessage;
