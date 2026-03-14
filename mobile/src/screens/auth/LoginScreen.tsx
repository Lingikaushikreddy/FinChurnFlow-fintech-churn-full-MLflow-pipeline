/**
 * Login Screen - Phone number input for OTP authentication
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  HelperText,
  Surface,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppDispatch, RootState } from '../../store';
import { sendOTP, clearError } from '../../store/slices/authSlice';
import { AuthStackParamList } from '../../navigation';
import { colors, spacing } from '../../theme';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const [phone, setPhone] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const validatePhone = (value: string): boolean => {
    const cleaned = value.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
  };

  const handleSendOTP = async () => {
    if (!validatePhone(phone)) {
      return;
    }

    dispatch(clearError());
    const result = await dispatch(sendOTP(phone));

    if (sendOTP.fulfilled.match(result)) {
      navigation.navigate('OTP', { phone });
    }
  };

  const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned;
    }
    return cleaned.slice(0, 10);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo and Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>₹</Text>
          </View>
          <Text style={styles.title}>Razorpay Nano</Text>
          <Text style={styles.subtitle}>
            Simple payments for your business
          </Text>
        </View>

        {/* Login Form */}
        <Surface style={styles.formCard}>
          <Text style={styles.formTitle}>Login with Mobile</Text>

          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              mode="outlined"
              placeholder="Enter mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              error={!!error}
              disabled={isLoading}
              outlineStyle={styles.inputOutline}
            />
          </View>

          {error && (
            <HelperText type="error" visible={!!error}>
              {typeof error === 'string' ? error : 'Something went wrong'}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleSendOTP}
            loading={isLoading}
            disabled={!validatePhone(phone) || isLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Get OTP
          </Button>

          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
        </Surface>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem icon="✓" text="Accept payments via QR & links" />
          <FeatureItem icon="✓" text="Send money instantly" />
          <FeatureItem icon="✓" text="Manage your business" />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const FeatureItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textInverse,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textInverse,
    opacity: 0.9,
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: 16,
    elevation: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  countryCode: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 4,
    borderRadius: 4,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryCodeText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  inputOutline: {
    borderRadius: 4,
  },
  button: {
    marginTop: spacing.md,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  termsText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '500',
  },
  features: {
    marginTop: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureIcon: {
    fontSize: 16,
    color: colors.textInverse,
    marginRight: spacing.sm,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 14,
    color: colors.textInverse,
    opacity: 0.9,
  },
});

export default LoginScreen;
