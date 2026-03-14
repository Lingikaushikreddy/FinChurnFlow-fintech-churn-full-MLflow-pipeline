/**
 * Formatting Utilities
 */

/**
 * Format amount in Indian currency format
 */
export const formatCurrency = (
  amount: number,
  options?: {
    showSymbol?: boolean;
    showDecimals?: boolean;
  }
): string => {
  const { showSymbol = true, showDecimals = false } = options || {};

  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return showSymbol ? `₹${formatted}` : formatted;
};

/**
 * Format amount with sign (+/-)
 */
export const formatSignedAmount = (
  amount: number,
  isCredit: boolean
): string => {
  const sign = isCredit ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(amount))}`;
};

/**
 * Format compact amount (1K, 1L, 1Cr)
 */
export const formatCompactAmount = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

/**
 * Format phone number with masking
 */
export const formatPhoneNumber = (
  phone: string,
  options?: { masked?: boolean; countryCode?: boolean }
): string => {
  const { masked = false, countryCode = false } = options || {};

  const cleaned = phone.replace(/\D/g, '');

  if (masked && cleaned.length >= 10) {
    const last4 = cleaned.slice(-4);
    const masked = 'X'.repeat(cleaned.length - 4);
    return countryCode ? `+91 ${masked}${last4}` : `${masked}${last4}`;
  }

  if (cleaned.length === 10) {
    return countryCode
      ? `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
      : `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }

  return phone;
};

/**
 * Format UPI ID
 */
export const formatUpiId = (upiId: string): string => {
  return upiId.toLowerCase().trim();
};

/**
 * Mask UPI ID for display
 */
export const maskUpiId = (upiId: string): string => {
  const parts = upiId.split('@');
  if (parts.length !== 2) return upiId;

  const username = parts[0];
  const provider = parts[1];

  if (username.length <= 3) {
    return upiId;
  }

  const maskedUsername = username.slice(0, 2) + 'X'.repeat(username.length - 2);
  return `${maskedUsername}@${provider}`;
};

/**
 * Format date for display
 */
export const formatDate = (
  date: Date | string,
  format: 'short' | 'long' | 'relative' = 'short'
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (format === 'relative') {
    if (d.toDateString() === now.toDateString()) {
      return 'Today';
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
  }

  if (format === 'short') {
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  }

  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Format time
 */
export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format date and time
 */
export const formatDateTime = (
  date: Date | string,
  options?: { includeSeconds?: boolean }
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: options?.includeSeconds ? '2-digit' : undefined,
    hour12: true,
  });

  if (d.toDateString() === now.toDateString()) {
    return `Today, ${timeStr}`;
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });

  return `${dateStr}, ${timeStr}`;
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return formatDate(d, 'short');
};
