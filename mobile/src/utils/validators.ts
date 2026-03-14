/**
 * Validation Utilities
 */

/**
 * Validate Indian phone number
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  // Indian phone numbers: 10 digits starting with 6-9
  return /^[6-9]\d{9}$/.test(cleaned);
};

/**
 * Validate UPI ID
 */
export const isValidUpiId = (upiId: string): boolean => {
  // UPI ID format: username@provider
  // Username: alphanumeric, dots, hyphens (1-256 chars)
  // Provider: alphanumeric (1-64 chars)
  return /^[a-zA-Z0-9._-]{1,256}@[a-zA-Z0-9]{1,64}$/.test(upiId);
};

/**
 * Validate email
 */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Validate PIN (4-6 digits)
 */
export const isValidPin = (pin: string): boolean => {
  return /^\d{4,6}$/.test(pin);
};

/**
 * Validate OTP (6 digits)
 */
export const isValidOtp = (otp: string): boolean => {
  return /^\d{6}$/.test(otp);
};

/**
 * Validate amount
 */
export const isValidAmount = (
  amount: number | string,
  options?: {
    min?: number;
    max?: number;
    allowZero?: boolean;
  }
): boolean => {
  const { min = 1, max = 10000000, allowZero = false } = options || {};

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) return false;
  if (!allowZero && num === 0) return false;
  if (num < min) return false;
  if (num > max) return false;

  return true;
};

/**
 * Validate IFSC code
 */
export const isValidIfsc = (ifsc: string): boolean => {
  // IFSC format: 4 chars bank code + 0 + 6 chars branch code
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
};

/**
 * Validate bank account number
 */
export const isValidBankAccount = (accountNumber: string): boolean => {
  // Indian bank account numbers: 9-18 digits
  const cleaned = accountNumber.replace(/\D/g, '');
  return /^\d{9,18}$/.test(cleaned);
};

/**
 * Validate PAN number
 */
export const isValidPan = (pan: string): boolean => {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
};

/**
 * Validate Aadhaar number
 */
export const isValidAadhaar = (aadhaar: string): boolean => {
  const cleaned = aadhaar.replace(/\D/g, '');
  // Aadhaar is 12 digits, first digit cannot be 0 or 1
  return /^[2-9]\d{11}$/.test(cleaned);
};

/**
 * Validate GST number
 */
export const isValidGstin = (gstin: string): boolean => {
  // GSTIN format: 2 digit state code + 10 char PAN + 1 char entity + 1 char Z + 1 checksum
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    gstin.toUpperCase()
  );
};

/**
 * Validate name (basic)
 */
export const isValidName = (
  name: string,
  options?: { minLength?: number; maxLength?: number }
): boolean => {
  const { minLength = 2, maxLength = 100 } = options || {};

  const trimmed = name.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return false;
  }

  // Allow letters, spaces, dots, and hyphens
  return /^[a-zA-Z\s.\-']+$/.test(trimmed);
};

/**
 * Validate business name
 */
export const isValidBusinessName = (
  name: string,
  options?: { minLength?: number; maxLength?: number }
): boolean => {
  const { minLength = 2, maxLength = 200 } = options || {};

  const trimmed = name.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return false;
  }

  // Allow letters, numbers, spaces, and common business punctuation
  return /^[a-zA-Z0-9\s.\-'&,()]+$/.test(trimmed);
};

/**
 * Get validation error message
 */
export const getValidationError = (
  type: string,
  value: string
): string | null => {
  switch (type) {
    case 'phone':
      if (!value) return 'Phone number is required';
      if (!isValidPhoneNumber(value)) return 'Enter a valid 10-digit phone number';
      break;
    case 'upi':
      if (!value) return 'UPI ID is required';
      if (!isValidUpiId(value)) return 'Enter a valid UPI ID (e.g., name@upi)';
      break;
    case 'email':
      if (!value) return 'Email is required';
      if (!isValidEmail(value)) return 'Enter a valid email address';
      break;
    case 'pin':
      if (!value) return 'PIN is required';
      if (!isValidPin(value)) return 'Enter a 4-6 digit PIN';
      break;
    case 'otp':
      if (!value) return 'OTP is required';
      if (!isValidOtp(value)) return 'Enter a 6-digit OTP';
      break;
    case 'name':
      if (!value) return 'Name is required';
      if (!isValidName(value)) return 'Enter a valid name';
      break;
    case 'amount':
      if (!value) return 'Amount is required';
      if (!isValidAmount(value)) return 'Enter a valid amount';
      break;
    default:
      return null;
  }
  return null;
};
