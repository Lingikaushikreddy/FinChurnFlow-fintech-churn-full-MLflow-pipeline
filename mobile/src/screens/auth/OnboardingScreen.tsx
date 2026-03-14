/**
 * Onboarding Screen - Business profile setup
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  HelperText,
  Surface,
  ProgressBar,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '../../store';
import { updateProfile, setOnboarded } from '../../store/slices/merchantSlice';
import { colors, spacing } from '../../theme';

const OnboardingScreen: React.FC = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.merchant);

  // Skip onboarding for testing (only in dev mode)
  const handleSkip = async () => {
    // Set demo data
    await dispatch(
      updateProfile({
        name: 'Demo User',
        business_name: 'Demo Business',
        upi_id: 'demo@upi',
      })
    );
    dispatch(setOnboarded(true));
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Please enter your name';
    }
    if (!businessName.trim()) {
      newErrors.businessName = 'Please enter your business name';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!upiId.trim()) {
      newErrors.upiId = 'Please enter your UPI ID';
    } else if (!/^[\w.\-]+@[\w]+$/.test(upiId)) {
      newErrors.upiId = 'Please enter a valid UPI ID (e.g., yourname@upi)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleComplete = async () => {
    if (!validateStep2()) return;

    const result = await dispatch(
      updateProfile({
        name: name.trim(),
        business_name: businessName.trim(),
        upi_id: upiId.trim(),
      })
    );

    if (updateProfile.fulfilled.match(result)) {
      dispatch(setOnboarded(true));
    }
  };

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepSubtitle}>
        This helps us personalize your experience
      </Text>

      <TextInput
        label="Your Name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        error={!!errors.name}
        placeholder="e.g., Ramesh Kumar"
      />
      {errors.name && (
        <HelperText type="error" visible>
          {errors.name}
        </HelperText>
      )}

      <TextInput
        label="Business Name"
        value={businessName}
        onChangeText={setBusinessName}
        mode="outlined"
        style={styles.input}
        error={!!errors.businessName}
        placeholder="e.g., Ramesh General Store"
      />
      {errors.businessName && (
        <HelperText type="error" visible>
          {errors.businessName}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleNext}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Continue
      </Button>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Set up payments</Text>
      <Text style={styles.stepSubtitle}>
        Add your UPI ID to receive payments directly
      </Text>

      <TextInput
        label="Your UPI ID"
        value={upiId}
        onChangeText={setUpiId}
        mode="outlined"
        style={styles.input}
        error={!!errors.upiId}
        placeholder="e.g., ramesh@upi"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {errors.upiId && (
        <HelperText type="error" visible>
          {errors.upiId}
        </HelperText>
      )}

      <View style={styles.upiHint}>
        <Text style={styles.hintText}>
          You can find your UPI ID in apps like Google Pay, PhonePe, or Paytm
        </Text>
      </View>

      {error && (
        <HelperText type="error" visible style={styles.apiError}>
          {typeof error === 'string' ? error : 'Something went wrong'}
        </HelperText>
      )}

      <View style={styles.buttonRow}>
        <Button
          mode="outlined"
          onPress={() => setStep(1)}
          style={[styles.button, styles.backButton]}
          contentStyle={styles.buttonContent}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleComplete}
          loading={isLoading}
          disabled={isLoading}
          style={[styles.button, styles.completeButton]}
          contentStyle={styles.buttonContent}
        >
          Get Started
        </Button>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Welcome to Razorpay Nano</Text>
              <Text style={styles.subtitle}>Let's set up your account</Text>
            </View>
            {__DEV__ && (
              <Button
                mode="text"
                onPress={handleSkip}
                compact
                style={styles.skipButton}
              >
                Skip
              </Button>
            )}
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={step / 2}
            color={colors.primary}
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>Step {step} of 2</Text>
        </View>

        {/* Form Card */}
        <Surface style={styles.formCard}>
          {step === 1 ? renderStep1() : renderStep2()}
        </Surface>

        {/* Features Preview */}
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>What you'll get:</Text>
          <FeatureItem text="Accept payments via QR & links" />
          <FeatureItem text="Send money to anyone instantly" />
          <FeatureItem text="Track all your transactions" />
          <FeatureItem text="Manage your products & orders" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const FeatureItem: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>✓</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  skipButton: {
    marginTop: -spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: 16,
    elevation: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  button: {
    marginTop: spacing.md,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  backButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  completeButton: {
    flex: 2,
  },
  upiHint: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  hintText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  apiError: {
    textAlign: 'center',
  },
  features: {
    marginTop: spacing.xl,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureIcon: {
    fontSize: 16,
    color: colors.success,
    marginRight: spacing.sm,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default OnboardingScreen;
