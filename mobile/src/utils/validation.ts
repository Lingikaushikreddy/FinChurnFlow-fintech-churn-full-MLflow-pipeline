/**
 * Validation Utilities
 * Robust form validation with comprehensive rules
 */

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Validation rule type
type ValidationRule<T> = (value: T, fieldName: string, allValues?: Record<string, unknown>) => string | null;

// Common regex patterns
export const PATTERNS = {
  PHONE_INDIA: /^[6-9]\d{9}$/,
  UPI_ID: /^[\w.-]+@[\w]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  BANK_ACCOUNT: /^\d{9,18}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  AADHAAR: /^\d{12}$/,
  GST: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/,
  PIN_CODE: /^\d{6}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  NUMERIC: /^\d+$/,
  NAME: /^[a-zA-Z\s'-]+$/,
  NAME_HINDI: /^[\u0900-\u097F\s]+$/,
  NAME_HINDI_ENGLISH: /^[\u0900-\u097Fa-zA-Z\s.\-']{2,100}$/,
  AMOUNT: /^\d+(\.\d{1,2})?$/,
};

// Validation messages (can be used with i18n)
export const MESSAGES = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => `${field} must not exceed ${max} characters`,
  min: (field: string, min: number) => `${field} must be at least ${min}`,
  max: (field: string, max: number) => `${field} must not exceed ${max}`,
  pattern: (field: string) => `${field} format is invalid`,
  phone: () => 'Please enter a valid 10-digit mobile number',
  upi: () => 'Please enter a valid UPI ID (e.g., name@upi)',
  email: () => 'Please enter a valid email address',
  ifsc: () => 'Please enter a valid IFSC code',
  bankAccount: () => 'Please enter a valid bank account number (9-18 digits)',
  amount: () => 'Please enter a valid amount',
  pin: () => 'Please enter a 4-digit PIN',
  otp: () => 'Please enter a 6-digit OTP',
  match: (field: string, matchField: string) => `${field} must match ${matchField}`,
};

// Basic validation rules
export const rules = {
  required: <T>(value: T, fieldName: string): string | null => {
    if (value === null || value === undefined || value === '' ||
        (Array.isArray(value) && value.length === 0)) {
      return MESSAGES.required(fieldName);
    }
    return null;
  },

  minLength: (min: number) => (value: string, fieldName: string): string | null => {
    if (value && value.length < min) {
      return MESSAGES.minLength(fieldName, min);
    }
    return null;
  },

  maxLength: (max: number) => (value: string, fieldName: string): string | null => {
    if (value && value.length > max) {
      return MESSAGES.maxLength(fieldName, max);
    }
    return null;
  },

  min: (minValue: number) => (value: number, fieldName: string): string | null => {
    if (value !== undefined && value !== null && value < minValue) {
      return MESSAGES.min(fieldName, minValue);
    }
    return null;
  },

  max: (maxValue: number) => (value: number, fieldName: string): string | null => {
    if (value !== undefined && value !== null && value > maxValue) {
      return MESSAGES.max(fieldName, maxValue);
    }
    return null;
  },

  pattern: (regex: RegExp, message?: string) => (value: string, fieldName: string): string | null => {
    if (value && !regex.test(value)) {
      return message || MESSAGES.pattern(fieldName);
    }
    return null;
  },

  phone: (value: string): string | null => {
    if (value && !PATTERNS.PHONE_INDIA.test(value)) {
      return MESSAGES.phone();
    }
    return null;
  },

  upi: (value: string): string | null => {
    if (value && !PATTERNS.UPI_ID.test(value)) {
      return MESSAGES.upi();
    }
    return null;
  },

  email: (value: string): string | null => {
    if (value && !PATTERNS.EMAIL.test(value)) {
      return MESSAGES.email();
    }
    return null;
  },

  ifsc: (value: string): string | null => {
    if (value && !PATTERNS.IFSC.test(value.toUpperCase())) {
      return MESSAGES.ifsc();
    }
    return null;
  },

  bankAccount: (value: string): string | null => {
    if (value && !PATTERNS.BANK_ACCOUNT.test(value)) {
      return MESSAGES.bankAccount();
    }
    return null;
  },

  amount: (value: string | number): string | null => {
    const strValue = String(value);
    if (strValue && !PATTERNS.AMOUNT.test(strValue)) {
      return MESSAGES.amount();
    }
    const numValue = parseFloat(strValue);
    if (isNaN(numValue) || numValue <= 0) {
      return MESSAGES.amount();
    }
    return null;
  },

  pin: (value: string): string | null => {
    if (value && (!/^\d{4}$/.test(value))) {
      return MESSAGES.pin();
    }
    return null;
  },

  otp: (value: string): string | null => {
    if (value && (!/^\d{6}$/.test(value))) {
      return MESSAGES.otp();
    }
    return null;
  },

  match: (matchFieldName: string, matchFieldLabel: string) =>
    (value: string, fieldName: string, allValues?: Record<string, unknown>): string | null => {
      if (allValues && value !== allValues[matchFieldName]) {
        return MESSAGES.match(fieldName, matchFieldLabel);
      }
      return null;
    },

  custom: <T>(validator: (value: T) => boolean, message: string) =>
    (value: T): string | null => {
      if (!validator(value)) {
        return message;
      }
      return null;
    },
};

// Validate a single field with multiple rules
export function validateField<T>(
  value: T,
  fieldName: string,
  fieldRules: Array<ValidationRule<T>>,
  allValues?: Record<string, unknown>
): string | null {
  for (const rule of fieldRules) {
    const error = rule(value, fieldName, allValues);
    if (error) {
      return error;
    }
  }
  return null;
}

// Validate entire form
export function validateForm(
  values: Record<string, unknown>,
  schema: Record<string, { label: string; rules: Array<ValidationRule<unknown>> }>
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [fieldName, config] of Object.entries(schema)) {
    const error = validateField(values[fieldName], config.label, config.rules, values);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Pre-built validation schemas
export const schemas = {
  login: {
    phone: {
      label: 'Phone number',
      rules: [rules.required, rules.phone],
    },
  },

  otp: {
    otp: {
      label: 'OTP',
      rules: [rules.required, rules.otp],
    },
  },

  contact: {
    name: {
      label: 'Name',
      rules: [rules.required, rules.minLength(2), rules.maxLength(100)],
    },
    upi_id: {
      label: 'UPI ID',
      rules: [rules.upi],
    },
    phone: {
      label: 'Phone number',
      rules: [rules.phone],
    },
    bank_account: {
      label: 'Bank account',
      rules: [rules.bankAccount],
    },
    ifsc: {
      label: 'IFSC code',
      rules: [rules.ifsc],
    },
  },

  employee: {
    name: {
      label: 'Employee name',
      rules: [rules.required, rules.minLength(2), rules.maxLength(100)],
    },
    phone: {
      label: 'Phone number',
      rules: [rules.phone],
    },
    upi_id: {
      label: 'UPI ID',
      rules: [rules.upi],
    },
    salary: {
      label: 'Salary',
      rules: [rules.required, rules.min(1), rules.max(10000000)],
    },
  },

  product: {
    name: {
      label: 'Product name',
      rules: [rules.required, rules.minLength(2), rules.maxLength(200)],
    },
    price: {
      label: 'Price',
      rules: [rules.required, rules.min(0), rules.max(10000000)],
    },
    stock: {
      label: 'Stock',
      rules: [rules.min(0), rules.max(1000000)],
    },
  },

  payout: {
    amount: {
      label: 'Amount',
      rules: [rules.required, rules.amount, rules.min(1), rules.max(10000000)],
    },
    pin: {
      label: 'PIN',
      rules: [rules.required, rules.pin],
    },
  },

  paymentLink: {
    amount: {
      label: 'Amount',
      rules: [rules.required, rules.amount, rules.min(1), rules.max(10000000)],
    },
    description: {
      label: 'Description',
      rules: [rules.maxLength(500)],
    },
  },

  creditEntry: {
    customer_name: {
      label: 'Customer name',
      rules: [
        rules.required,
        rules.minLength(2),
        rules.maxLength(100),
        rules.pattern(PATTERNS.NAME_HINDI_ENGLISH, 'Name can contain Hindi, English letters, spaces, dots, hyphens only'),
      ],
    },
    amount: {
      label: 'Amount',
      rules: [rules.required, rules.min(1), rules.max(10000000)],
    },
    direction: {
      label: 'Direction',
      rules: [
        rules.required,
        rules.custom(
          (v: string) => v === 'credit' || v === 'debit',
          'Direction must be credit or debit'
        ),
      ],
    },
    customer_phone: {
      label: 'Phone number',
      rules: [rules.phone],
    },
    item: {
      label: 'Item',
      rules: [rules.maxLength(200)],
    },
  },
};

// Hook-friendly validation
export function useValidation<T extends Record<string, unknown>>(
  schema: Record<keyof T, { label: string; rules: Array<ValidationRule<unknown>> }>
) {
  const validate = (values: T): ValidationResult => {
    return validateForm(values as Record<string, unknown>, schema);
  };

  const validateSingle = (fieldName: keyof T, value: unknown, allValues?: T): string | null => {
    const config = schema[fieldName];
    if (!config) return null;
    return validateField(value, config.label, config.rules, allValues as Record<string, unknown>);
  };

  return { validate, validateSingle };
}

// Maximum length for voice text input
const VOICE_TEXT_MAX_LENGTH = 500;

// Sanitization utilities
export const sanitize = {
  phone: (value: string): string => value.replace(/\D/g, '').slice(-10),
  amount: (value: string): string => value.replace(/[^\d.]/g, ''),
  upi: (value: string): string => value.toLowerCase().trim(),
  ifsc: (value: string): string => value.toUpperCase().trim(),
  bankAccount: (value: string): string => value.replace(/\D/g, ''),
  name: (value: string): string => value.trim().replace(/\s+/g, ' '),
  pin: (value: string): string => value.replace(/\D/g, '').slice(0, 4),
  otp: (value: string): string => value.replace(/\D/g, '').slice(0, 6),

  /**
   * Sanitize voice/text input for AI chat
   * Strips injection characters, limits length, normalizes whitespace
   */
  voiceText: (value: string): string => {
    if (!value) return '';

    return value
      // Strip potentially dangerous characters (prompt injection, control chars)
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Remove excessive special characters that could be prompt injection
      .replace(/[{}[\]<>\\|`~^]/g, '')
      // Normalize whitespace
      .trim()
      .replace(/\s+/g, ' ')
      // Limit length
      .slice(0, VOICE_TEXT_MAX_LENGTH);
  },

  /**
   * Sanitize customer name from voice input
   * Allows Hindi + English characters, strips everything else
   */
  customerName: (value: string): string => {
    if (!value) return '';

    return value
      // Keep only Hindi chars, English chars, spaces, dots, hyphens, apostrophes
      .replace(/[^\u0900-\u097Fa-zA-Z\s.\-']/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 100);
  },
};

// Validate a credit entry (convenience wrapper)
export function validateCreditEntry(values: {
  customer_name?: string;
  amount?: number;
  direction?: string;
  customer_phone?: string;
  item?: string;
}): ValidationResult {
  return validateForm(values as Record<string, unknown>, schemas.creditEntry);
}

export default {
  rules,
  schemas,
  validateField,
  validateForm,
  validateCreditEntry,
  useValidation,
  sanitize,
  PATTERNS,
  MESSAGES,
};
