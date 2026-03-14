/**
 * Amount Input Component - Currency input with quick amount selection
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '../theme';

interface AmountInputProps {
  value: string;
  onChangeValue: (value: string) => void;
  label?: string;
  error?: string;
  quickAmounts?: number[];
  maxAmount?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

const DEFAULT_QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeValue,
  label = 'Amount',
  error,
  quickAmounts = DEFAULT_QUICK_AMOUNTS,
  maxAmount,
  disabled = false,
  autoFocus = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleAmountChange = (text: string) => {
    // Remove non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = cleaned.split('.');
    let formatted = parts[0];
    if (parts.length > 1) {
      formatted += '.' + parts[1].slice(0, 2);
    }

    // Check max amount
    const numValue = parseFloat(formatted);
    if (maxAmount && numValue > maxAmount) {
      return;
    }

    onChangeValue(formatted);
  };

  const handleQuickAmountPress = (amount: number) => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    onChangeValue(amount.toString());
    inputRef.current?.blur();
  };

  const formatDisplayAmount = (val: string): string => {
    if (!val) return '';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num.toLocaleString('en-IN');
  };

  const getBorderColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.primary;
    return colors.border;
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          { borderColor: getBorderColor() },
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        <Text style={styles.currencySymbol}>₹</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={handleAmountChange}
          placeholder="0"
          placeholderTextColor={colors.textDisabled}
          keyboardType="decimal-pad"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          selectTextOnFocus
        />
        {value && parseFloat(value) > 0 && (
          <TouchableOpacity
            onPress={() => onChangeValue('')}
            style={styles.clearButton}
          >
            <Icon name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Quick Amount Chips */}
      <View style={styles.quickAmountsContainer}>
        {quickAmounts.map((amount) => (
          <Animated.View
            key={amount}
            style={{ transform: [{ scale: scaleAnim }] }}
          >
            <TouchableOpacity
              style={[
                styles.quickAmountChip,
                value === amount.toString() && styles.quickAmountChipSelected,
              ]}
              onPress={() => handleQuickAmountPress(amount)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.quickAmountText,
                  value === amount.toString() && styles.quickAmountTextSelected,
                ]}
              >
                ₹{amount.toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  inputContainerError: {
    borderColor: colors.error,
    backgroundColor: colors.error + '05',
  },
  inputContainerDisabled: {
    opacity: 0.5,
    backgroundColor: colors.surfaceVariant,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  clearButton: {
    padding: spacing.xs,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  quickAmountChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAmountChipSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  quickAmountTextSelected: {
    color: colors.primary,
  },
});

export default AmountInput;
