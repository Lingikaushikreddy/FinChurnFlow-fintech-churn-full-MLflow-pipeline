/**
 * OTP Screen - OTP verification
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import {
  Text,
  Button,
  HelperText,
  Surface,
  IconButton,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppDispatch, RootState } from '../../store';
import { verifyOTP, sendOTP, clearError } from '../../store/slices/authSlice';
import { AuthStackParamList } from '../../navigation';
import { colors, spacing } from '../../theme';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
type OTPRouteProp = RouteProp<AuthStackParamList, 'OTP'>;

const OTP_LENGTH = 6;

const OTPScreen: React.FC = () => {
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OTPRouteProp>();
  const { phone } = route.params;

  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();

    // Start resend timer
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const otpArray = value.slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      otpArray.forEach((char, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);

      // Focus last filled input or next empty
      const lastIndex = Math.min(index + otpArray.length, OTP_LENGTH - 1);
      inputRefs.current[lastIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Move to next input
      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      return;
    }

    dispatch(clearError());
    await dispatch(verifyOTP({ phone, otp: otpString }));
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    dispatch(clearError());
    await dispatch(sendOTP(phone));
    setResendTimer(30);
    setOtp(new Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  };

  const maskedPhone = phone.replace(/(\d{2})(\d{5})(\d{3})/, '+91 $1*****$3');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Back Button */}
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          iconColor={colors.textInverse}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.phoneText}>{maskedPhone}</Text>
          </Text>
        </View>

        {/* OTP Form */}
        <Surface style={styles.formCard}>
          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <RNTextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : null,
                  error ? styles.otpInputError : null,
                ]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                selectTextOnFocus
              />
            ))}
          </View>

          {error && (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {typeof error === 'string' ? error : 'Something went wrong'}
            </HelperText>
          )}

          {/* Dev mode hint */}
          {__DEV__ && (
            <HelperText type="info" visible style={styles.devHint}>
              Dev mode: Use OTP 123456
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleVerify}
            loading={isLoading}
            disabled={otp.join('').length !== OTP_LENGTH || isLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Verify & Continue
          </Button>

          {/* Resend OTP */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {resendTimer > 0 ? (
              <Text style={styles.timerText}>Resend in {resendTimer}s</Text>
            ) : (
              <Text style={styles.resendLink} onPress={handleResend}>
                Resend OTP
              </Text>
            )}
          </View>
        </Surface>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  backButton: {
    marginLeft: -spacing.sm,
    marginTop: spacing.md,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textInverse,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textInverse,
    opacity: 0.9,
    lineHeight: 24,
  },
  phoneText: {
    fontWeight: '600',
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: 16,
    elevation: 4,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  otpInputError: {
    borderColor: colors.error,
  },
  errorText: {
    textAlign: 'center',
  },
  devHint: {
    textAlign: 'center',
    backgroundColor: '#E8F5E9',
    marginTop: spacing.xs,
    borderRadius: 4,
  },
  button: {
    marginTop: spacing.md,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timerText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default OTPScreen;
