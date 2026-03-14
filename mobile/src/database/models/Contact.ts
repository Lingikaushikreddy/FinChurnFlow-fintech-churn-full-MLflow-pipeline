/**
 * Contact Model - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

export interface Contact {
  id: string;
  serverId: string | null;
  merchantId: string;
  name: string;
  phone: string | null;
  upiId: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  isVerified: boolean;
  lastUsedAt: Date | null;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Helper functions that were getters on the class
export const hasUpi = (contact: Contact): boolean => {
  return !!contact.upiId;
};

export const hasBankAccount = (contact: Contact): boolean => {
  return !!contact.bankAccount && !!contact.ifsc;
};

export const getPaymentMethod = (contact: Contact): 'upi' | 'bank' | 'none' => {
  if (hasUpi(contact)) return 'upi';
  if (hasBankAccount(contact)) return 'bank';
  return 'none';
};

export const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const getMaskedBankAccount = (bankAccount: string | null): string | null => {
  if (!bankAccount) return null;
  const len = bankAccount.length;
  if (len <= 4) return bankAccount;
  return `${'*'.repeat(len - 4)}${bankAccount.slice(-4)}`;
};

export default Contact;
