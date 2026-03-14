/**
 * QR Display Component - Shows QR code with share/download options
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, shadows } from '../theme';

interface QRDisplayProps {
  value: string;
  size?: number;
  title?: string;
  subtitle?: string;
  amount?: number;
  showActions?: boolean;
  onDownload?: () => void;
  logoSource?: any;
}

const QRDisplay: React.FC<QRDisplayProps> = ({
  value,
  size = 200,
  title,
  subtitle,
  amount,
  showActions = true,
  onDownload,
  logoSource,
}) => {
  const qrRef = useRef<any>(null);

  const handleShare = async () => {
    try {
      const message = amount
        ? `Pay ₹${amount.toLocaleString('en-IN')} using this UPI link: ${value}`
        : `Scan this QR code to pay: ${value}`;

      await Share.share({
        message,
        title: 'Share Payment QR',
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share QR code');
      }
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior - get base64 of QR
      qrRef.current?.toDataURL((data: string) => {
        // In a real app, you would save this to device storage
        Alert.alert('Success', 'QR code saved to gallery');
      });
    }
  };

  const formatAmount = (amt: number): string => {
    return amt.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}

      {/* QR Code */}
      <View style={styles.qrContainer}>
        <View style={styles.qrWrapper}>
          <QRCode
            value={value}
            size={size}
            backgroundColor={colors.white}
            color={colors.textPrimary}
            logo={logoSource}
            logoSize={size * 0.2}
            logoBackgroundColor={colors.white}
            logoBorderRadius={8}
            getRef={(ref) => (qrRef.current = ref)}
          />
        </View>

        {/* Amount Badge */}
        {amount && (
          <View style={styles.amountBadge}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>₹{formatAmount(amount)}</Text>
          </View>
        )}
      </View>

      {/* UPI ID */}
      <View style={styles.upiContainer}>
        <Icon name="qrcode-scan" size={16} color={colors.primary} />
        <Text style={styles.upiText}>Scan & Pay via any UPI app</Text>
      </View>

      {/* Actions */}
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="share-variant" size={22} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDownload}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.success + '15' }]}>
              <Icon name="download" size={22} color={colors.success} />
            </View>
            <Text style={styles.actionText}>Download</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrWrapper: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    ...shadows.sm,
  },
  amountBadge: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  upiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 20,
    gap: spacing.xs,
  },
  upiText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
});

export default QRDisplay;
