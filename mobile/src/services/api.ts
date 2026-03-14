/**
 * API Service - Handles all API communication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use mock API in development (set to true for simulator without backend)
// Set to false when running with Docker backend services
const USE_MOCK_API = false;

// AI Chat uses the real backend API even in development
// Set to false to always call the real /ai/chat endpoint
const USE_MOCK_AI = false;

// Base URL for API
// iOS Simulator uses localhost, Android Emulator uses 10.0.2.2
import { Platform } from 'react-native';
const API_BASE_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000'
  : 'https://api.nano.app';

// Mock data storage
const mockStorage: {
  otpSent: { [phone: string]: string };
  merchants: { [phone: string]: any };
} = {
  otpSent: {},
  merchants: {},
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest) {
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;
          await AsyncStorage.setItem('accessToken', access_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Clear tokens and redirect to login
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
      }
    }

    return Promise.reject(error);
  }
);

// Simple base64 encode for React Native (doesn't have Buffer)
const btoa = (str: string): string => {
  try {
    return global.btoa(str);
  } catch {
    // Fallback for environments without btoa
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let i = 0; i < str.length; i += 3) {
      const a = str.charCodeAt(i);
      const b = str.charCodeAt(i + 1);
      const c = str.charCodeAt(i + 2);
      output += chars[a >> 2];
      output += chars[((a & 3) << 4) | (b >> 4)];
      output += chars[((b & 15) << 2) | (c >> 6)];
      output += chars[c & 63];
    }
    return output;
  }
};

const atob = (str: string): string => {
  try {
    return global.atob(str);
  } catch {
    // Fallback for environments without atob
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    const input = str.replace(/=+$/, '');
    for (let i = 0; i < input.length; i += 4) {
      const a = chars.indexOf(input[i]);
      const b = chars.indexOf(input[i + 1]);
      const c = chars.indexOf(input[i + 2]);
      const d = chars.indexOf(input[i + 3]);
      output += String.fromCharCode((a << 2) | (b >> 4));
      if (c !== 64) output += String.fromCharCode(((b & 15) << 4) | (c >> 2));
      if (d !== 64) output += String.fromCharCode(((c & 3) << 6) | d);
    }
    return output;
  }
};

// Generate mock JWT token
const generateMockToken = (phone: string, type: 'access' | 'refresh'): string => {
  const payload = {
    phone,
    type,
    exp: Date.now() + (type === 'access' ? 15 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000),
  };
  return `mock_${type}_${btoa(JSON.stringify(payload))}`;
};

// Mock Auth API
const mockAuthAPI = {
  sendOTP: async (phone: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate a random 6-digit OTP (in real app this would be sent via SMS)
    // For development, we use "123456" as the OTP
    const otp = '123456';
    mockStorage.otpSent[phone] = otp;

    console.log(`[Mock API] OTP for ${phone}: ${otp}`);

    return {
      success: true,
      message: 'OTP sent successfully',
      // In dev mode, we return the OTP for easy testing
      dev_otp: otp,
    };
  },

  verifyOTP: async (phone: string, otp: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const storedOTP = mockStorage.otpSent[phone];

    // Accept "123456" as universal dev OTP or the stored OTP
    if (otp !== '123456' && otp !== storedOTP) {
      throw {
        response: {
          data: { detail: 'Invalid OTP. Use 123456 for testing.' }
        }
      };
    }

    // Generate mock tokens
    const access_token = generateMockToken(phone, 'access');
    const refresh_token = generateMockToken(phone, 'refresh');

    // Create mock merchant if doesn't exist
    if (!mockStorage.merchants[phone]) {
      mockStorage.merchants[phone] = {
        id: `merchant_${Date.now()}`,
        phone,
        name: null,
        business_name: null,
        upi_id: null,
        kyc_status: 'pending',
        created_at: new Date().toISOString(),
      };
    }

    // Store tokens
    await AsyncStorage.setItem('accessToken', access_token);
    await AsyncStorage.setItem('refreshToken', refresh_token);

    // Clear OTP
    delete mockStorage.otpSent[phone];

    return {
      access_token,
      refresh_token,
      merchant: mockStorage.merchants[phone],
      is_new_user: !mockStorage.merchants[phone].name,
    };
  },

  refreshToken: async (refreshToken: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Extract phone from token (mock implementation)
    try {
      const payload = JSON.parse(atob(refreshToken.split('_')[2]));
      const access_token = generateMockToken(payload.phone, 'access');
      await AsyncStorage.setItem('accessToken', access_token);
      return { access_token };
    } catch {
      throw { response: { data: { detail: 'Invalid refresh token' } } };
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
  },
};

// Real Auth API
const realAuthAPI = {
  sendOTP: async (phone: string) => {
    const response = await api.post('/auth/otp/send', { phone });
    return response.data;
  },

  verifyOTP: async (phone: string, otp: string) => {
    const response = await api.post('/auth/otp/verify', { phone, otp });
    const { access_token, refresh_token } = response.data;

    // Store tokens
    await AsyncStorage.setItem('accessToken', access_token);
    await AsyncStorage.setItem('refreshToken', refresh_token);

    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    const { access_token } = response.data;
    await AsyncStorage.setItem('accessToken', access_token);
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
  },
};

// Export auth API based on environment
export const authAPI = USE_MOCK_API ? mockAuthAPI : realAuthAPI;

// Mock Merchant storage
let mockMerchantProfile: any = null;
let mockPin: string | null = null;

// Convert snake_case to camelCase for profile
const normalizeProfile = (profile: any) => ({
  id: profile.id,
  phone: profile.phone,
  name: profile.name,
  businessName: profile.business_name || profile.businessName,
  upiId: profile.upi_id || profile.upiId,
  kycStatus: profile.kyc_status || profile.kycStatus || 'pending',
  isActive: profile.is_active ?? profile.isActive ?? true,
  createdAt: profile.created_at || profile.createdAt,
});

// Mock Merchant API
const mockMerchantAPI = {
  getProfile: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!mockMerchantProfile) {
      mockMerchantProfile = {
        id: `merchant_${Date.now()}`,
        phone: '9876543210',
        name: null, // New user starts without name
        business_name: null,
        upi_id: null,
        kyc_status: 'pending',
        is_active: true,
        created_at: new Date().toISOString(),
      };
    }

    return normalizeProfile(mockMerchantProfile);
  },

  updateProfile: async (data: any) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Handle both snake_case and camelCase inputs
    const updates = {
      name: data.name,
      business_name: data.business_name || data.businessName,
      upi_id: data.upi_id || data.upiId,
    };

    mockMerchantProfile = { ...mockMerchantProfile, ...updates };
    return normalizeProfile(mockMerchantProfile);
  },

  setPin: async (pin: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    mockPin = pin;
    return { success: true, message: 'PIN set successfully' };
  },

  verifyPin: async (pin: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Accept "1234" as universal dev PIN or the stored PIN
    if (pin !== '1234' && pin !== mockPin) {
      throw { response: { data: { detail: 'Invalid PIN. Use 1234 for testing.' } } };
    }

    return { success: true, valid: true };
  },

  getDashboard: async () => {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      today_collection: Math.floor(Math.random() * 50000) + 5000,
      today_payouts: Math.floor(Math.random() * 10000) + 1000,
      today_transactions: Math.floor(Math.random() * 20) + 5,
      pending_orders: Math.floor(Math.random() * 5),
      balance: Math.floor(Math.random() * 100000) + 10000,
    };
  },
};

// Real Merchant API
const realMerchantAPI = {
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.put('/auth/me', data);
    return response.data;
  },

  setPin: async (pin: string) => {
    const response = await api.post('/auth/pin/set', { pin });
    return response.data;
  },

  verifyPin: async (pin: string) => {
    const response = await api.post('/auth/pin/verify', { pin });
    return response.data;
  },

  getDashboard: async () => {
    const response = await api.get('/payments/transactions/today/stats');
    return response.data;
  },
};

// Export merchant API based on environment
export const merchantAPI = USE_MOCK_API ? mockMerchantAPI : realMerchantAPI;

// Transactions API
export const transactionsAPI = {
  list: async (params: any) => {
    const response = await api.get('/payments/transactions', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/payments/transactions/${id}`);
    return response.data;
  },

  getSummary: async (params?: any) => {
    const response = await api.get('/payments/transactions/summary', { params });
    return response.data;
  },

  getDaily: async (days: number = 7) => {
    const response = await api.get('/payments/transactions/daily', { params: { days } });
    return response.data;
  },
};

// Payment Links API
export const paymentLinksAPI = {
  create: async (data: { amount?: number; description?: string; expiresInHours?: number }) => {
    const response = await api.post('/payments/links/create', data);
    return response.data;
  },

  list: async (params?: any) => {
    const response = await api.get('/payments/links', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/payments/links/${id}`);
    return response.data;
  },

  disable: async (id: string) => {
    const response = await api.delete(`/payments/links/${id}`);
    return response.data;
  },
};

// QR Code API
export const qrCodeAPI = {
  create: async (data: { amount?: number; description?: string }) => {
    const response = await api.post('/payments/qr/create', data);
    return response.data;
  },

  getDefault: async () => {
    const response = await api.get('/payments/qr/static/default');
    return response.data;
  },

  list: async () => {
    const response = await api.get('/payments/qr');
    return response.data;
  },
};

// Contacts API
export const contactsAPI = {
  list: async (params?: any) => {
    const response = await api.get('/payouts/contacts', { params });
    return response.data;
  },

  getRecent: async () => {
    const response = await api.get('/payouts/contacts/recent/used');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/payouts/contacts', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/payouts/contacts/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/payouts/contacts/${id}`);
    return response.data;
  },
};

// Payouts API
export const payoutsAPI = {
  transfer: async (data: { contactId?: string; upiId?: string; amount: number; description?: string; pin: string }) => {
    const response = await api.post('/payouts/transfer', data);
    return response.data;
  },

  bulkTransfer: async (data: { items: any[]; pin: string }) => {
    const response = await api.post('/payouts/bulk', data);
    return response.data;
  },

  getHistory: async (params?: any) => {
    const response = await api.get('/payouts/history', { params });
    return response.data;
  },
};

// ==========================================
// AI Chat API - Phase 1 Implementation
// ==========================================

// Intent patterns for local classification (mirrors backend)
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  show_qr: [
    /(show|open|display|see|view)\s*(my\s*)?(qr|qr\s*code)/i,
    /qr\s*(code)?\s*(show|open|display)/i,
    /(my|mera)\s*qr(\s*code)?/i,
    /payment\s*qr/i,
  ],
  create_payment_link: [
    /(create|make|generate).*(payment\s*link|link)/i,
    /(payment\s*)?link.*(create|make|for|of)/i,
    /(create|make|generate)\s*(a\s*)?(payment\s*)?link/i,
    /link\s*(for|of)\s*(\d+|₹)/i,
    /(\d+|₹\d+)\s*(ka)?\s*link/i,
  ],
  check_balance: [
    /(check|show|what|how much).*(balance|collection|earnings|money)/i,
    /(today|today's).*(collection|earning|income|sale)/i,
    /how\s*much\s*(did\s*i|have\s*i)?\s*(earn|make|collect)/i,
    /(my|today's?)\s*(earnings?|collection|balance|sales?)/i,
    /what('?s|\s+is)\s*(my\s*)?(balance|collection)/i,
  ],
  add_credit: [
    /(\w+)\s*(ke|ka|ki)\s*(khaate|khate|khaata|khata)\s*(mein|me|mai)\s*(\d+)/i,
    /(\w+)\s*(ka|ke|ki)\s*(\d+)\s*(udhaar|udhar|credit|likh)/i,
    /khaata.*(\d+).*likho/i,
    /khaate?\s*(mein|me|mai)\s*(\d+)\s*(likho|likh\s*do|add|daal)/i,
    /(add|create)\s*(credit|khaata|khata)\s*(entry|for)/i,
    /(\d+)\s*(rupees?|rs\.?|₹)?\s*(udhaar|udhar|credit)\s*(likh|add|daal)/i,
    /udhaar\s*(likh|likho|add|daal)/i,
    /(\w+)\s*ko\s*(\d+)\s*(diya|liya|dena|lena)/i,
  ],
  share_whatsapp: [
    /(\w+)\s*(ko|ke)\s*(\d+)?\s*(ka)?\s*(link|payment)?\s*(bhej|send|share)\s*(karo|do|karein)?.*whatsapp/i,
    /whatsapp\s*(pe|par|se)\s*(bhej|send|share)/i,
    /(\w+)\s*(ko|ke)\s*whatsapp\s*(pe|par|se)\s*(bhej|send|share)/i,
    /whatsapp.*link.*bhej/i,
    /link.*whatsapp.*bhej/i,
    /(send|share)\s*(payment\s*)?(link|reminder)?\s*(on|via|through)\s*whatsapp/i,
    /whatsapp\s*(reminder|yaad)/i,
  ],
  help: [
    /^(help|what can you do|madad)$/i,
    /(help me|assist|madad)/i,
  ],
};

// Extract amount from message
const extractAmount = (message: string): number | null => {
  const patterns = [
    /₹\s*(\d+(?:,\d{3})*)/,
    /(\d+(?:,\d{3})*)\s*(rupees|rs|rupaiye|rupaye)/i,
    /(?:for|of|ka|ke|ki)\s*(\d+)/i,
    /(\d+)\s*(ka|का)?\s*link/i,
    /(\d+)\s*(likh|diya|liya|dena|lena|udhaar|udhar|credit)/i,
  ];

  for (const pattern of patterns) {
    try {
      const match = message.match(pattern);
      if (match) {
        return parseInt(match[1].replace(/,/g, ''), 10);
      }
    } catch {
      continue;
    }
  }
  return null;
};

// Extract customer name from message
const extractCustomerName = (message: string): string | null => {
  const patterns = [
    /(\w+)\s*(ke|ka|ki)\s*(khaate|khate|khaata|khata)/i,
    /(\w+)\s*(ko|ke)\s*(\d+)?\s*(bhej|send|share)/i,
    /(\w+)\s*ko\s*\d+\s*(diya|liya|dena|lena)/i,
    /(\w+)\s*(ka|ke|ki)\s*\d+\s*(udhaar|udhar|credit)/i,
  ];

  const skipWords = new Set([
    'mera', 'meri', 'mere', 'aaj', 'kal', 'khaata', 'khata',
    'udhaar', 'udhar', 'payment', 'link', 'create', 'show',
    'check', 'help', 'whatsapp', 'amount', 'rupees',
  ]);

  for (const pattern of patterns) {
    try {
      const match = message.match(pattern);
      if (match && match[1] && !skipWords.has(match[1].toLowerCase())) {
        // Capitalize first letter
        const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        return name;
      }
    } catch {
      continue;
    }
  }
  return null;
};

// Extract phone number from message
const extractPhone = (message: string): string | null => {
  const match = message.match(/(?:\+?91)?[- ]?([6-9]\d{9})/);
  return match ? match[1] : null;
};

// Extract credit direction from message
const extractDirection = (message: string): 'credit' | 'debit' => {
  const creditPatterns = /\b(diya|de\s*diya|jama|credit|bheja|paid|payment\s*diya)\b/i;
  if (creditPatterns.test(message)) return 'credit';
  return 'debit'; // default is debit (udhaar liya)
};

// Local intent classification
const classifyIntent = (message: string): { intent: string | null; entities: Record<string, any> } => {
  const lowerMessage = message.toLowerCase();

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      try {
        if (pattern.test(lowerMessage)) {
          const entities: Record<string, any> = {};

          // Extract amount for payment-related intents
          if (intent === 'create_payment_link' || intent === 'add_credit' || intent === 'share_whatsapp') {
            const amount = extractAmount(message);
            if (amount) entities.amount = amount;
          }

          // Extract customer name for credit and whatsapp intents
          if (intent === 'add_credit' || intent === 'share_whatsapp') {
            const customerName = extractCustomerName(message);
            if (customerName) entities.customer_name = customerName;

            const phone = extractPhone(message);
            if (phone) entities.customer_phone = phone;
          }

          // Extract direction for credit intents
          if (intent === 'add_credit') {
            entities.direction = extractDirection(message);
          }

          return { intent, entities };
        }
      } catch {
        continue;
      }
    }
  }

  return { intent: null, entities: {} };
};

// Mock AI responses for Phase 1
const mockAIChat = async (message: string, sessionId?: string): Promise<any> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

  const { intent, entities } = classifyIntent(message);

  // Session ID for tracking conversation
  const newSessionId = sessionId || `session_${Date.now()}`;

  // Phase 1 responses
  if (intent === 'show_qr') {
    return {
      message: "Here's your QR code. Customers can scan this to pay you directly.",
      intent: 'show_qr',
      entities: {},
      action: {
        type: 'navigate',
        screen: 'QRCode',
        params: {},
        label: 'Show QR Code',
      },
      session_id: newSessionId,
      suggestions: ['Create payment link', 'Check balance', 'Help'],
    };
  }

  if (intent === 'create_payment_link') {
    const amount = entities.amount;
    if (amount) {
      return {
        message: `Creating a payment link for ₹${amount}. Tap the button below to generate and share it.`,
        intent: 'create_payment_link',
        entities: { amount },
        action: {
          type: 'action',
          action: 'create_payment_link',
          params: { amount },
          label: `Create ₹${amount} Link`,
          confirm: false,
        },
        session_id: newSessionId,
        suggestions: ['₹100', '₹500', '₹1000'],
      };
    } else {
      return {
        message: "I'll help you create a payment link. How much should it be for? Or tap below to create a flexible amount link.",
        intent: 'create_payment_link',
        entities: {},
        action: {
          type: 'navigate',
          screen: 'CreateLink',
          params: {},
          label: 'Create Payment Link',
        },
        session_id: newSessionId,
        suggestions: ['₹100', '₹500', '₹1000', 'Any amount'],
      };
    }
  }

  if (intent === 'check_balance') {
    return {
      message: "Let me show you today's collection and balance summary.",
      intent: 'check_balance',
      entities: {},
      action: {
        type: 'navigate',
        screen: 'Dashboard',
        params: { refresh: true },
        label: 'View Dashboard',
      },
      session_id: newSessionId,
      suggestions: ['Show QR code', 'Create payment link', 'View transactions'],
    };
  }

  if (intent === 'add_credit') {
    const customerName = entities.customer_name;
    const amount = entities.amount;
    const direction = entities.direction || 'debit';

    // Missing customer name - ask conversationally
    if (!customerName && !amount) {
      return {
        message: 'Haanji, khaata mein likhna hai? Kiska naam hai aur kitna amount hai?',
        intent: 'add_credit',
        entities: {},
        action: null,
        session_id: newSessionId,
        suggestions: ['Raju ka 500 udhaar', 'Sharma ji ko 1000 diya', 'Khaata dikhaao'],
      };
    }

    if (!customerName) {
      return {
        message: `₹${amount} kiske khaate mein likhna hai? Naam bataiye.`,
        intent: 'add_credit',
        entities: { amount },
        action: null,
        session_id: newSessionId,
        suggestions: ['Raju', 'Sharma ji', 'Cancel'],
      };
    }

    if (!amount) {
      return {
        message: `${customerName} ke khaate mein kitna likhna hai?`,
        intent: 'add_credit',
        entities: { customer_name: customerName },
        action: null,
        session_id: newSessionId,
        suggestions: ['₹100', '₹500', '₹1000'],
      };
    }

    // Both present - return action with confirm
    const directionLabel = direction === 'debit' ? 'udhaar (liya)' : 'jama (diya)';
    return {
      message: `${customerName} ke khaate mein ₹${amount} ${directionLabel} likhein?`,
      intent: 'add_credit',
      entities: { customer_name: customerName, amount, direction },
      action: {
        type: 'action',
        action: 'add_credit',
        params: { customer_name: customerName, amount, direction },
        label: `₹${amount} ${customerName} ke khaate mein likho`,
        confirm: true,
      },
      session_id: newSessionId,
      suggestions: [],
    };
  }

  if (intent === 'share_whatsapp') {
    const customerName = entities.customer_name;
    const amount = entities.amount;
    const phone = entities.customer_phone;

    // Missing recipient
    if (!customerName && !phone) {
      return {
        message: 'WhatsApp pe kisko bhejein? Naam ya phone number bataiye.',
        intent: 'share_whatsapp',
        entities: { amount },
        action: null,
        session_id: newSessionId,
        suggestions: ['Sharma ji ko', 'Raju ko', '9876543210 pe'],
      };
    }

    // Has recipient, create WhatsApp action
    const recipientLabel = customerName || phone || '';
    const messageText = amount
      ? `${recipientLabel} ko ₹${amount} ka payment link WhatsApp pe bhejein?`
      : `${recipientLabel} ko WhatsApp pe message bhejein?`;

    return {
      message: messageText,
      intent: 'share_whatsapp',
      entities: { customer_name: customerName, amount, phone },
      action: {
        type: 'whatsapp',
        action: amount ? 'create_and_share_whatsapp' : 'share_whatsapp',
        params: {
          recipient_name: customerName || '',
          phone: phone || '',
          amount,
          message: amount
            ? `Namaste ${recipientLabel} ji, ₹${amount} ka payment pending hai. Yahan se pay karein:`
            : `Namaste ${recipientLabel} ji`,
        },
        label: amount
          ? `₹${amount} ka link ${recipientLabel} ko WhatsApp pe bhejo`
          : `${recipientLabel} ko WhatsApp pe bhejo`,
        confirm: true,
      },
      session_id: newSessionId,
      suggestions: [],
    };
  }

  if (intent === 'help') {
    return {
      message: "Namaste! Main aapka Nano assistant hoon. Main yeh sab kar sakta hoon:\n\n📱 'Mera QR dikhao' - Payment QR code\n🔗 '500 ka link banao' - Payment link\n💰 'Aaj ki collection dikhao' - Earnings\n📒 'Raju ka 500 udhaar likho' - Khaata entry\n💬 'Sharma ji ko link bhejo WhatsApp pe' - WhatsApp share\n\nBoliye ya type kariye!",
      intent: 'help',
      entities: {},
      action: null,
      session_id: newSessionId,
      suggestions: ['QR dikhao', 'Link banao', 'Khaata likho', 'Madad'],
    };
  }

  // Default response for unknown intent
  return {
    message: "Samajh nahi aaya. Yeh try karein:\n• 'Mera QR dikhao'\n• '500 ka link banao'\n• 'Aaj ki collection'\n• 'Raju ka 500 udhaar likho'\n• 'Sharma ji ko link bhejo WhatsApp pe'",
    intent: null,
    entities: {},
    action: null,
    session_id: newSessionId,
    suggestions: ['QR dikhao', 'Link banao', 'Khaata likho', 'Madad'],
  };
};

// Mock suggestions
const mockAISuggestions = async (): Promise<any> => {
  await new Promise(resolve => setTimeout(resolve, 200));

  return {
    suggestions: [
      { id: '1', text: 'Mera QR dikhao', intent: 'show_qr' },
      { id: '2', text: '500 ka link banao', intent: 'create_payment_link' },
      { id: '3', text: 'Aaj ki collection', intent: 'check_balance' },
      { id: '4', text: 'Raju ka 500 udhaar likho', intent: 'add_credit' },
      { id: '5', text: 'Sharma ji ko link bhejo WhatsApp pe', intent: 'share_whatsapp' },
      { id: '6', text: 'Madad', intent: 'help' },
    ],
  };
};

// Real AI API
const realAIAPI = {
  chat: async (message: string, sessionId?: string) => {
    const response = await api.post('/ai/chat', { message, session_id: sessionId });
    return response.data;
  },

  getSuggestions: async () => {
    const response = await api.get('/ai/suggestions');
    return response.data;
  },

  voiceInput: async (audioBase64: string, language: string = 'hi-IN') => {
    const response = await api.post('/ai/voice/transcribe', {
      audio_base64: audioBase64,
      language,
    });
    return response.data;
  },
};

// Mock AI API for development
const mockAIAPI = {
  chat: mockAIChat,
  getSuggestions: mockAISuggestions,
  voiceInput: async (audioBase64: string, language: string = 'hi-IN') => {
    // Voice input would use device STT, return empty for mock
    return { text: '', transcript: '' };
  },
};

// Export AI API based on environment
// Uses USE_MOCK_AI (not USE_MOCK_API) so AI chat can hit the real backend
// independently of auth/merchant mocks
export const aiAPI = USE_MOCK_AI ? mockAIAPI : realAIAPI;

// Reports API
export const reportsAPI = {
  daily: async (date?: string) => {
    const response = await api.get('/reports/daily', { params: { date } });
    return response.data;
  },

  weekly: async () => {
    const response = await api.get('/reports/weekly');
    return response.data;
  },

  monthly: async (month?: number, year?: number) => {
    const response = await api.get('/reports/monthly', { params: { month, year } });
    return response.data;
  },

  insights: async () => {
    const response = await api.get('/reports/insights');
    return response.data;
  },
};

// Store API - Product catalog and orders
export const storeAPI = {
  // Products
  listProducts: async (params?: { page?: number; search?: string; category_id?: string }) => {
    const response = await api.get('/store/products', { params });
    return response.data;
  },

  getProduct: async (id: string) => {
    const response = await api.get(`/store/products/${id}`);
    return response.data;
  },

  createProduct: async (data: {
    name: string;
    description?: string;
    price: number;
    stock?: number;
    category_id?: string;
    images?: string[];
  }) => {
    const response = await api.post('/store/products', data);
    return response.data;
  },

  updateProduct: async (id: string, data: Partial<{
    name: string;
    description: string;
    price: number;
    stock: number;
    category_id: string;
    images: string[];
    is_active: boolean;
  }>) => {
    const response = await api.put(`/store/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id: string) => {
    const response = await api.delete(`/store/products/${id}`);
    return response.data;
  },

  // Categories
  listCategories: async () => {
    const response = await api.get('/store/categories');
    return response.data;
  },

  createCategory: async (data: { name: string; parent_id?: string }) => {
    const response = await api.post('/store/categories', data);
    return response.data;
  },

  // Orders
  listOrders: async (params?: { page?: number; status?: string }) => {
    const response = await api.get('/store/orders', { params });
    return response.data;
  },

  getOrder: async (id: string) => {
    const response = await api.get(`/store/orders/${id}`);
    return response.data;
  },

  createOrder: async (data: {
    customer_phone: string;
    customer_name?: string;
    items: Array<{ product_id: string; quantity: number; price: number }>;
  }) => {
    const response = await api.post('/store/orders', data);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string) => {
    const response = await api.put(`/store/orders/${id}/status`, { status });
    return response.data;
  },

  // Catalog
  getPublicCatalog: async (merchantId: string) => {
    const response = await api.get(`/store/catalog/${merchantId}`);
    return response.data;
  },

  getCatalogQR: async () => {
    const response = await api.get('/store/catalog/qr');
    return response.data;
  },
};

// Payroll API - Employee and salary management
export const payrollAPI = {
  // Employees
  listEmployees: async (params?: { page?: number; search?: string; is_active?: boolean }) => {
    const response = await api.get('/payroll/employees', { params });
    return response.data;
  },

  getEmployee: async (id: string) => {
    const response = await api.get(`/payroll/employees/${id}`);
    return response.data;
  },

  createEmployee: async (data: {
    name: string;
    phone?: string;
    upi_id?: string;
    salary: number;
    pay_day?: number;
  }) => {
    const response = await api.post('/payroll/employees', data);
    return response.data;
  },

  updateEmployee: async (id: string, data: Partial<{
    name: string;
    phone: string;
    upi_id: string;
    salary: number;
    pay_day: number;
    is_active: boolean;
  }>) => {
    const response = await api.put(`/payroll/employees/${id}`, data);
    return response.data;
  },

  deleteEmployee: async (id: string) => {
    const response = await api.delete(`/payroll/employees/${id}`);
    return response.data;
  },

  // Salary
  processSalary: async (data: { employee_ids: string[]; pin: string; month?: number; year?: number }) => {
    const response = await api.post('/payroll/salary/process', data);
    return response.data;
  },

  getSalaryHistory: async (params?: { employee_id?: string; page?: number }) => {
    const response = await api.get('/payroll/salary/history', { params });
    return response.data;
  },

  // Advances
  recordAdvance: async (data: { employee_id: string; amount: number; description?: string }) => {
    const response = await api.post('/payroll/advance', data);
    return response.data;
  },

  getAdvances: async (employeeId: string) => {
    const response = await api.get(`/payroll/employees/${employeeId}/advances`);
    return response.data;
  },

  // Summary
  getPayrollSummary: async () => {
    const response = await api.get('/payroll/summary');
    return response.data;
  },
};

// Khaata (Credit Ledger) API
export const khaataAPI = {
  createEntry: async (data: {
    customer_name: string;
    amount: number;
    direction: 'credit' | 'debit';
    customer_phone?: string;
    description?: string;
    item?: string;
  }) => {
    const response = await api.post('/ai/khaata/entries', data);
    return response.data;
  },

  listEntries: async (params?: {
    customer_name?: string;
    direction?: 'credit' | 'debit';
    is_settled?: boolean;
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get('/ai/khaata/entries', { params });
    return response.data;
  },

  getOverview: async () => {
    const response = await api.get('/ai/khaata/overview');
    return response.data;
  },

  getCustomerLedger: async (customerName: string) => {
    const response = await api.get(`/ai/khaata/customer/${encodeURIComponent(customerName)}`);
    return response.data;
  },

  settleEntry: async (entryId: string) => {
    const response = await api.post(`/ai/khaata/entries/${entryId}/settle`);
    return response.data;
  },
};

export default api;
