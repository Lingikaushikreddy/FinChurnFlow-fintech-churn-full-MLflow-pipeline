/**
 * ActionHandler - Processes AI actions and executes them
 *
 * Supports:
 * - show_qr: Navigate to QR screen
 * - create_payment_link: Create and share payment link
 * - check_balance: Navigate to dashboard
 * - add_credit: Add khaata entry with confirmation
 * - create_and_share_whatsapp: Create link + open WhatsApp
 * - share_whatsapp: Open WhatsApp directly
 */

import { NavigationContainerRef } from '@react-navigation/native';
import { Share, Alert, Linking } from 'react-native';
import { paymentLinksAPI } from './api';

// Action types from AI responses
export interface AIAction {
  type: 'navigate' | 'action' | 'share' | 'call' | 'whatsapp';
  screen?: string;
  action?: string;
  params?: Record<string, any>;
  label: string;
  confirm?: boolean;
}

// Action result
export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

// Navigation reference (set from App.tsx)
let navigationRef: NavigationContainerRef<any> | null = null;

export const setNavigationRef = (ref: NavigationContainerRef<any>) => {
  navigationRef = ref;
};

/**
 * Execute an AI action
 */
export const executeAction = async (action: AIAction): Promise<ActionResult> => {
  if (!action) {
    return { success: false, message: 'No action provided' };
  }

  // If action requires confirmation, show dialog first
  if (action.confirm) {
    return new Promise((resolve) => {
      confirmAction(
        action,
        async () => {
          const result = await _executeActionDirect(action);
          resolve(result);
        },
        () => {
          resolve({ success: false, message: 'Action cancelled' });
        }
      );
    });
  }

  return _executeActionDirect(action);
};

/**
 * Execute action without confirmation check (internal)
 */
const _executeActionDirect = async (action: AIAction): Promise<ActionResult> => {
  try {
    switch (action.type) {
      case 'navigate':
        return handleNavigate(action);

      case 'action':
        return handleAction(action);

      case 'share':
        return handleShare(action);

      case 'call':
        return handleCall(action);

      case 'whatsapp':
        return handleWhatsApp(action);

      default:
        return { success: false, message: `Unknown action type: ${action.type}` };
    }
  } catch (error: any) {
    console.error('Action execution error:', error);
    return { success: false, message: error.message || 'Kuch gadbad ho gayi' };
  }
};

/**
 * Handle navigation action
 */
const handleNavigate = (action: AIAction): ActionResult => {
  if (!navigationRef) {
    return { success: false, message: 'Navigation not available' };
  }

  const screen = action.screen;
  const params = action.params || {};

  type NavRoute = {
    type: 'tab' | 'modal' | 'nested';
    tab?: string;
    stack?: string;
    screen?: string;
  };

  const screenMap: Record<string, NavRoute> = {
    // Phase 1 screens
    'QRCode': { type: 'tab', tab: 'Payments', screen: 'QRCode' },
    'CreateLink': { type: 'tab', tab: 'Payments', screen: 'PaymentLinks' },
    'Dashboard': { type: 'tab', tab: 'Home' },
    'Home': { type: 'tab', tab: 'Home' },

    // Phase 2+ screens
    'SendMoney': { type: 'tab', tab: 'Payouts', screen: 'PayoutMain' },
    'Contacts': { type: 'tab', tab: 'Payouts', screen: 'Contacts' },
    'Transactions': { type: 'tab', tab: 'Transactions' },
    'Profile': { type: 'tab', tab: 'Profile' },

    // Modal screens
    'AddProduct': { type: 'modal', stack: 'StoreStack', screen: 'AddProduct' },
    'Products': { type: 'modal', stack: 'StoreStack', screen: 'ProductList' },
    'Store': { type: 'modal', stack: 'StoreStack', screen: 'ProductList' },
    'Payroll': { type: 'modal', stack: 'PayrollStack', screen: 'EmployeeList' },
    'ProcessSalary': { type: 'modal', stack: 'PayrollStack', screen: 'SalaryProcess' },
    'Reports': { type: 'modal', stack: 'Reports' },
  };

  const mapping = screenMap[screen || ''];

  if (!mapping) {
    console.warn(`Unknown screen: ${screen}`);
    return { success: false, message: `Unknown screen: ${screen}` };
  }

  try {
    if (mapping.type === 'tab') {
      if (mapping.screen) {
        navigationRef.navigate('Main', {
          screen: mapping.tab,
          params: {
            screen: mapping.screen,
            params,
          },
        });
      } else {
        navigationRef.navigate('Main', {
          screen: mapping.tab,
          params,
        });
      }
    } else if (mapping.type === 'modal') {
      if (mapping.screen) {
        // @ts-expect-error - Navigation types are complex with nested navigators
        navigationRef.navigate(mapping.stack, {
          screen: mapping.screen,
          params,
        });
      } else {
        // @ts-expect-error - Navigation types are complex with nested navigators
        navigationRef.navigate(mapping.stack, params);
      }
    }

    return {
      success: true,
      message: `Navigated to ${screen}`,
      data: { screen, params },
    };
  } catch (error: any) {
    console.error('Navigation error:', error);
    return { success: false, message: `Navigation failed: ${error.message}` };
  }
};

/**
 * Handle executable action (like creating payment link, adding credit)
 */
const handleAction = async (action: AIAction): Promise<ActionResult> => {
  const actionName = action.action;
  const params = action.params || {};

  switch (actionName) {
    case 'create_payment_link':
      return createPaymentLink(params.amount, params.description);

    case 'add_credit':
      return handleAddCredit(params);

    default:
      return { success: false, message: `Unknown action: ${actionName}` };
  }
};

/**
 * Handle add_credit action - calls backend /ai/action/confirm
 */
const handleAddCredit = async (params: Record<string, any>): Promise<ActionResult> => {
  // Client-side validation
  if (!params.customer_name || !params.amount) {
    return {
      success: false,
      message: 'Customer ka naam aur amount dono chahiye.',
    };
  }

  const amount = parseFloat(params.amount);
  if (isNaN(amount) || amount <= 0) {
    return {
      success: false,
      message: 'Amount sahi nahi hai. Kitna likhna hai?',
    };
  }

  if (amount > 10000000) {
    return {
      success: false,
      message: 'Amount ₹1 crore se zyada nahi ho sakta.',
    };
  }

  try {
    // Call the backend confirm endpoint
    const api = (await import('./api')).default;
    const response = await api.post('/ai/action/confirm', {
      action: 'add_credit',
      params: {
        customer_name: params.customer_name,
        amount: params.amount,
        direction: params.direction || 'debit',
        item: params.item,
        customer_phone: params.customer_phone,
      },
    });

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message,
        data: response.data.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Khaata mein likhne mein problem aayi.',
      };
    }
  } catch (error: any) {
    console.error('Add credit error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Kuch gadbad ho gayi, dobara try karein.',
    };
  }
};

/**
 * Create a payment link
 */
const createPaymentLink = async (
  amount?: number,
  description?: string
): Promise<ActionResult> => {
  try {
    const mockMode = __DEV__;

    if (mockMode) {
      const linkId = `link_${Date.now()}`;
      const shortUrl = `https://pay.nano.app/${linkId}`;

      const shareResult = await Share.share({
        message: amount
          ? `Pay ₹${amount} via Nano: ${shortUrl}`
          : `Pay via Nano: ${shortUrl}`,
        title: 'Payment Link',
      });

      return {
        success: true,
        message: amount
          ? `₹${amount} ka payment link ban gaya!`
          : 'Payment link ban gaya!',
        data: {
          linkId,
          shortUrl,
          amount,
          shared: shareResult.action === Share.sharedAction,
        },
      };
    }

    const response = await paymentLinksAPI.create({
      amount,
      description,
    });

    await Share.share({
      message: amount
        ? `Pay ₹${amount} via Nano: ${response.short_url}`
        : `Pay via Nano: ${response.short_url}`,
      title: 'Payment Link',
    });

    return {
      success: true,
      message: 'Payment link ban gaya aur share ke liye ready hai!',
      data: response,
    };
  } catch (error: any) {
    console.error('Create payment link error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Payment link banane mein problem aayi',
    };
  }
};

/**
 * Handle share action
 */
const handleShare = async (action: AIAction): Promise<ActionResult> => {
  const params = action.params || {};

  try {
    const result = await Share.share({
      message: params.message || '',
      title: params.title || 'Share',
      url: params.url,
    });

    return {
      success: result.action === Share.sharedAction,
      message: result.action === Share.sharedAction ? 'Share ho gaya!' : 'Share cancel kiya',
    };
  } catch (error: any) {
    return { success: false, message: 'Share nahi ho paya' };
  }
};

/**
 * Handle call action
 */
const handleCall = async (action: AIAction): Promise<ActionResult> => {
  const params = action.params || {};
  const phoneNumber = params.phone;

  if (!phoneNumber) {
    return { success: false, message: 'Phone number nahi mila' };
  }

  try {
    await Linking.openURL(`tel:${phoneNumber}`);
    return { success: true, message: 'Dialer khol raha hoon' };
  } catch (error) {
    return { success: false, message: 'Dialer nahi khul paya' };
  }
};

/**
 * Handle WhatsApp specific sharing
 */
const handleWhatsApp = async (action: AIAction): Promise<ActionResult> => {
  const params = action.params || {};
  const actionName = action.action;

  // If this is a create_and_share_whatsapp, call backend first
  if (actionName === 'create_and_share_whatsapp') {
    return handleCreateAndShareWhatsApp(params);
  }

  // Direct WhatsApp share
  const phone = params.phone || '';
  const text = params.message || '';

  return _openWhatsApp(phone, text);
};

/**
 * Handle create_and_share_whatsapp - creates link via backend, then opens WhatsApp
 */
const handleCreateAndShareWhatsApp = async (
  params: Record<string, any>
): Promise<ActionResult> => {
  try {
    // Call backend to create link + get WhatsApp URL
    const api = (await import('./api')).default;
    const response = await api.post('/ai/action/confirm', {
      action: 'create_and_share_whatsapp',
      params: {
        phone: params.phone || '',
        amount: params.amount,
        recipient_name: params.recipient_name || '',
        message: params.message || '',
      },
    });

    if (!response.data.success) {
      return {
        success: false,
        message: response.data.message || 'WhatsApp link nahi ban paya',
      };
    }

    const data = response.data.data;
    const phone = data.phone || params.phone || '';
    const message = data.message || params.message || '';

    return _openWhatsApp(phone, message);
  } catch (error: any) {
    console.error('Create and share WhatsApp error:', error);

    // Fallback: try to share via native Share API
    try {
      await Share.share({
        message: params.message || 'Payment reminder',
        title: 'Share',
      });
      return { success: true, message: 'Share dialog se bhej diya' };
    } catch {
      return {
        success: false,
        message: 'WhatsApp nahi khul paya. WhatsApp install hai?',
      };
    }
  }
};

/**
 * Open WhatsApp with phone and message, fallback to Share API
 */
const _openWhatsApp = async (phone: string, text: string): Promise<ActionResult> => {
  // Clean phone number
  let cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (cleanPhone && !cleanPhone.startsWith('+') && !cleanPhone.startsWith('91')) {
    cleanPhone = '91' + cleanPhone;
  }

  const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return { success: true, message: 'WhatsApp khol raha hoon' };
    } else {
      // Fallback to native Share API
      try {
        await Share.share({
          message: text,
          title: 'Share',
        });
        return { success: true, message: 'Share dialog se bhej diya' };
      } catch {
        return { success: false, message: 'WhatsApp install nahi hai' };
      }
    }
  } catch (error) {
    return { success: false, message: 'WhatsApp nahi khul paya' };
  }
};

/**
 * Show confirmation dialog for sensitive actions (Hinglish)
 */
export const confirmAction = (
  action: AIAction,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  // Use Hinglish for financial actions
  const isFinancial = action.action === 'add_credit' ||
    action.action === 'create_and_share_whatsapp' ||
    action.action === 'create_payment_link' ||
    action.type === 'whatsapp';

  const title = isFinancial ? 'Confirm Karein' : 'Confirm Action';
  const message = isFinancial
    ? `Kya aap "${action.label}" karna chahte hain?`
    : `Are you sure you want to ${action.label.toLowerCase()}?`;
  const confirmText = isFinancial ? 'Haan, Karein' : 'Confirm';
  const cancelText = isFinancial ? 'Nahi' : 'Cancel';

  Alert.alert(
    title,
    message,
    [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        onPress: onConfirm,
      },
    ]
  );
};

export default {
  setNavigationRef,
  executeAction,
  confirmAction,
};
