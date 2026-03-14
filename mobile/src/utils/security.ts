/**
 * Security Utilities
 * Biometric auth, secure storage, and data protection
 */

import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';

// Initialize biometrics
const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

// Encryption key (should be securely stored/derived in production)
const ENCRYPTION_KEY = 'RazorpayNano_SecureKey_v1';

// Secure storage keys
export const SECURE_KEYS = {
  PIN: 'user_pin',
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  BIOMETRIC_KEY: 'biometric_key',
  USER_CREDENTIALS: 'user_credentials',
};

// Biometric types
export type BiometricType = 'fingerprint' | 'face' | 'iris' | 'none';

// Biometric check result
export interface BiometricCheckResult {
  available: boolean;
  biometryType: BiometricType;
  error?: string;
}

// Biometric auth result
export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Check if biometric authentication is available
 */
export async function checkBiometricAvailability(): Promise<BiometricCheckResult> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    let type: BiometricType = 'none';
    if (available) {
      switch (biometryType) {
        case BiometryTypes.TouchID:
        case BiometryTypes.Biometrics:
          type = 'fingerprint';
          break;
        case BiometryTypes.FaceID:
          type = 'face';
          break;
        default:
          type = 'fingerprint';
      }
    }

    return {
      available,
      biometryType: type,
    };
  } catch (error) {
    return {
      available: false,
      biometryType: 'none',
      error: (error as Error).message,
    };
  }
}

/**
 * Authenticate using biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage = 'Confirm your identity'
): Promise<BiometricAuthResult> {
  try {
    const { available } = await checkBiometricAvailability();

    if (!available) {
      return {
        success: false,
        error: 'Biometric authentication not available',
      };
    }

    const { success, error } = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancel',
    });

    return {
      success,
      error: error || undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Create biometric keys for secure operations
 */
export async function createBiometricKeys(): Promise<boolean> {
  try {
    const { publicKey } = await rnBiometrics.createKeys();
    return !!publicKey;
  } catch (error) {
    console.error('Failed to create biometric keys:', error);
    return false;
  }
}

/**
 * Delete biometric keys
 */
export async function deleteBiometricKeys(): Promise<boolean> {
  try {
    const { keysDeleted } = await rnBiometrics.deleteKeys();
    return keysDeleted;
  } catch (error) {
    console.error('Failed to delete biometric keys:', error);
    return false;
  }
}

/**
 * Encrypt sensitive data
 */
export function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Hash sensitive data (one-way)
 */
export function hash(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

/**
 * Generate secure random string
 */
export function generateSecureRandom(length = 32): string {
  const array = CryptoJS.lib.WordArray.random(length);
  return array.toString(CryptoJS.enc.Hex);
}

/**
 * Store data securely in Keychain
 */
export async function secureStore(key: string, value: string): Promise<boolean> {
  try {
    const encryptedValue = encrypt(value);
    await Keychain.setGenericPassword(key, encryptedValue, {
      service: key,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      securityLevel: Platform.OS === 'android'
        ? Keychain.SECURITY_LEVEL.SECURE_HARDWARE
        : undefined,
    });
    return true;
  } catch (error) {
    console.error('Failed to store securely:', error);
    return false;
  }
}

/**
 * Retrieve data from secure storage
 */
export async function secureRetrieve(key: string): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({ service: key });
    if (credentials) {
      return decrypt(credentials.password);
    }
    return null;
  } catch (error) {
    console.error('Failed to retrieve securely:', error);
    return null;
  }
}

/**
 * Delete data from secure storage
 */
export async function secureDelete(key: string): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({ service: key });
    return true;
  } catch (error) {
    console.error('Failed to delete securely:', error);
    return false;
  }
}

/**
 * Store PIN securely with hash
 */
export async function storePin(pin: string): Promise<boolean> {
  const hashedPin = hash(pin);
  return secureStore(SECURE_KEYS.PIN, hashedPin);
}

/**
 * Verify PIN
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const storedHash = await secureRetrieve(SECURE_KEYS.PIN);
  if (!storedHash) return false;

  const inputHash = hash(pin);
  return storedHash === inputHash;
}

/**
 * Check if PIN is set
 */
export async function isPinSet(): Promise<boolean> {
  const pin = await secureRetrieve(SECURE_KEYS.PIN);
  return !!pin;
}

/**
 * Clear PIN
 */
export async function clearPin(): Promise<boolean> {
  return secureDelete(SECURE_KEYS.PIN);
}

/**
 * Store auth tokens securely
 */
export async function storeAuthTokens(
  accessToken: string,
  refreshToken: string
): Promise<boolean> {
  const accessStored = await secureStore(SECURE_KEYS.ACCESS_TOKEN, accessToken);
  const refreshStored = await secureStore(SECURE_KEYS.REFRESH_TOKEN, refreshToken);
  return accessStored && refreshStored;
}

/**
 * Get auth tokens from secure storage
 */
export async function getAuthTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const accessToken = await secureRetrieve(SECURE_KEYS.ACCESS_TOKEN);
  const refreshToken = await secureRetrieve(SECURE_KEYS.REFRESH_TOKEN);
  return { accessToken, refreshToken };
}

/**
 * Clear auth tokens
 */
export async function clearAuthTokens(): Promise<boolean> {
  const accessCleared = await secureDelete(SECURE_KEYS.ACCESS_TOKEN);
  const refreshCleared = await secureDelete(SECURE_KEYS.REFRESH_TOKEN);
  return accessCleared && refreshCleared;
}

/**
 * Mask sensitive data for display
 */
export const mask = {
  phone: (phone: string): string => {
    if (phone.length < 10) return phone;
    return `${phone.slice(0, 2)}****${phone.slice(-4)}`;
  },

  upi: (upi: string): string => {
    const [name, domain] = upi.split('@');
    if (!name || !domain) return upi;
    const maskedName = name.length > 3
      ? `${name.slice(0, 2)}***`
      : `${name[0]}**`;
    return `${maskedName}@${domain}`;
  },

  bankAccount: (account: string): string => {
    if (account.length < 8) return '****' + account.slice(-4);
    return '*'.repeat(account.length - 4) + account.slice(-4);
  },

  email: (email: string): string => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    const maskedName = name.length > 2
      ? `${name[0]}***${name.slice(-1)}`
      : `${name[0]}**`;
    return `${maskedName}@${domain}`;
  },

  name: (name: string): string => {
    const parts = name.split(' ');
    return parts
      .map((part) => (part.length > 2 ? `${part[0]}***` : part))
      .join(' ');
  },

  amount: (amount: number): string => {
    // Show only first and last digit
    const str = Math.floor(amount).toString();
    if (str.length <= 2) return '***';
    return `${str[0]}${'*'.repeat(str.length - 2)}${str.slice(-1)}`;
  },
};

/**
 * Input sanitization to prevent XSS and injection attacks
 */
export const sanitizeInput = {
  text: (input: string): string => {
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove special characters
      .trim();
  },

  numeric: (input: string): string => {
    return input.replace(/[^0-9.]/g, '');
  },

  alphanumeric: (input: string): string => {
    return input.replace(/[^a-zA-Z0-9\s]/g, '');
  },

  phone: (input: string): string => {
    return input.replace(/[^0-9+]/g, '').slice(0, 13);
  },

  upi: (input: string): string => {
    return input.toLowerCase().replace(/[^a-z0-9@._-]/g, '');
  },

  amount: (input: string): string => {
    const cleaned = input.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].slice(0, 2);
    }
    return cleaned;
  },
};

/**
 * Rate limiting for sensitive operations
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  check(key: string): { allowed: boolean; remainingAttempts: number; resetIn?: number } {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true, remainingAttempts: this.maxAttempts - 1 };
    }

    if (record.count >= this.maxAttempts) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetIn: Math.ceil((record.resetTime - now) / 1000),
      };
    }

    record.count++;
    return { allowed: true, remainingAttempts: this.maxAttempts - record.count };
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  pin: new RateLimiter(5, 5 * 60 * 1000), // 5 attempts per 5 minutes
  otp: new RateLimiter(3, 60 * 1000), // 3 attempts per minute
  login: new RateLimiter(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  payout: new RateLimiter(10, 60 * 1000), // 10 payouts per minute
};

export default {
  checkBiometricAvailability,
  authenticateWithBiometrics,
  createBiometricKeys,
  deleteBiometricKeys,
  encrypt,
  decrypt,
  hash,
  generateSecureRandom,
  secureStore,
  secureRetrieve,
  secureDelete,
  storePin,
  verifyPin,
  isPinSet,
  clearPin,
  storeAuthTokens,
  getAuthTokens,
  clearAuthTokens,
  mask,
  sanitizeInput,
  rateLimiters,
  SECURE_KEYS,
};
