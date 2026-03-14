/**
 * QR Code Screen - Display and share payment QR
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  Image,
} from 'react-native';
import {
  Text,
  Surface,
  Button,
  TextInput,
  ActivityIndicator,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';

import { RootState } from '../../store';
import { qrCodeAPI } from '../../services/api';
import { colors, spacing, shadows } from '../../theme';

const QRCodeScreen: React.FC = () => {
  const [qrType, setQrType] = useState<'static' | 'dynamic'>('static');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [qrData, setQrData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { profile } = useSelector((state: RootState) => state.merchant);

  const loadDefaultQR = useCallback(async () => {
    if (!profile?.upiId) return;

    setIsLoading(true);
    try {
      const response = await qrCodeAPI.getDefault();
      setQrData(response.qr_data);
    } catch (error) {
      console.error('Failed to load QR:', error);
      // Generate local QR if API fails
      const localQrData = `upi://pay?pa=${profile.upiId}&pn=${encodeURIComponent(
        profile.businessName || profile.name || 'Merchant'
      )}&cu=INR`;
      setQrData(localQrData);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (qrType === 'static') {
      loadDefaultQR();
    }
  }, [qrType, loadDefaultQR]);

  const generateDynamicQR = async () => {
    if (!amount && qrType === 'dynamic') {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    setIsLoading(true);
    try {
      const response = await qrCodeAPI.create({
        amount: amount ? parseFloat(amount) : undefined,
        description: description || undefined,
      });
      setQrData(response.qr_data);
    } catch (error) {
      console.error('Failed to create QR:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!profile?.upiId) return;

    try {
      await Share.share({
        message: `Pay ${profile.businessName || profile.name} via UPI:\n\nUPI ID: ${profile.upiId}${
          amount ? `\nAmount: ₹${amount}` : ''
        }`,
        title: 'Share Payment Details',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (!profile?.upiId) {
    return (
      <View style={styles.noUpiContainer}>
        <Text style={styles.noUpiText}>
          Please set up your UPI ID in profile settings to receive payments
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* QR Type Selector */}
      <SegmentedButtons
        value={qrType}
        onValueChange={(value) => setQrType(value as 'static' | 'dynamic')}
        buttons={[
          { value: 'static', label: 'Static QR' },
          { value: 'dynamic', label: 'Amount QR' },
        ]}
        style={styles.segmentedButtons}
      />

      {/* QR Code Display */}
      <Surface style={styles.qrCard}>
        <Text style={styles.merchantName}>
          {profile.businessName || profile.name}
        </Text>

        <View style={styles.qrContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : qrData ? (
            <QRCode
              value={qrData}
              size={220}
              color={colors.textPrimary}
              backgroundColor={colors.surface}
            />
          ) : (
            <Text style={styles.qrPlaceholder}>Generate QR Code</Text>
          )}
        </View>

        <View style={styles.upiIdContainer}>
          <Text style={styles.upiLabel}>UPI ID</Text>
          <Text style={styles.upiId}>{profile.upiId}</Text>
        </View>

        {amount && qrType === 'dynamic' && (
          <View style={styles.amountBadge}>
            <Text style={styles.amountText}>₹{amount}</Text>
          </View>
        )}
      </Surface>

      {/* Dynamic QR Options */}
      {qrType === 'dynamic' && (
        <Surface style={styles.optionsCard}>
          <TextInput
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={generateDynamicQR}
            loading={isLoading}
            style={styles.generateButton}
          >
            Generate QR
          </Button>
        </Surface>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          icon="share-variant"
          onPress={handleShare}
          style={styles.shareButton}
          contentStyle={styles.buttonContent}
        >
          Share QR
        </Button>
        <Button
          mode="outlined"
          icon="download"
          onPress={() => Alert.alert('Coming Soon', 'Download feature coming soon')}
          style={styles.downloadButton}
          contentStyle={styles.buttonContent}
        >
          Download
        </Button>
      </View>

      {/* Quick Amounts */}
      {qrType === 'dynamic' && (
        <View style={styles.quickAmounts}>
          <Text style={styles.quickLabel}>Quick Amounts</Text>
          <View style={styles.quickGrid}>
            {['100', '200', '500', '1000'].map((amt) => (
              <Button
                key={amt}
                mode="outlined"
                compact
                onPress={() => setAmount(amt)}
                style={styles.quickButton}
              >
                ₹{amt}
              </Button>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  noUpiContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  noUpiText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  segmentedButtons: {
    marginBottom: spacing.lg,
  },
  qrCard: {
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    ...shadows.md,
  },
  merchantName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  qrContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  qrPlaceholder: {
    color: colors.textSecondary,
  },
  upiIdContainer: {
    alignItems: 'center',
  },
  upiLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  upiId: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  amountBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginTop: spacing.md,
  },
  amountText: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionsCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  generateButton: {
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  shareButton: {
    flex: 1,
    borderRadius: 8,
  },
  downloadButton: {
    flex: 1,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  quickAmounts: {
    marginTop: spacing.lg,
  },
  quickLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickButton: {
    flex: 1,
  },
});

export default QRCodeScreen;
