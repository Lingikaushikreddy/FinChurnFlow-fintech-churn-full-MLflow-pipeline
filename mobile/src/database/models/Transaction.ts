/**
 * Transaction Model - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

export type TransactionType = 'payment' | 'payout' | 'salary' | 'advance';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Transaction {
  id: string;
  serverId: string | null;
  merchantId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  referenceId: string | null;
  counterpartyName: string | null;
  counterpartyUpi: string | null;
  counterpartyPhone: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  synced: boolean;
  serverCreatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Helper functions that were getters on the class
export const getDisplayAmount = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const isIncoming = (type: TransactionType): boolean => {
  return type === 'payment';
};

export const isOutgoing = (type: TransactionType): boolean => {
  return ['payout', 'salary', 'advance'].includes(type);
};

export const isPending = (status: TransactionStatus): boolean => {
  return status === 'pending' || status === 'processing';
};

export const isCompleted = (status: TransactionStatus): boolean => {
  return status === 'completed';
};

export const isFailed = (status: TransactionStatus): boolean => {
  return status === 'failed';
};

export const getCounterpartyDisplay = (tx: Transaction): string => {
  return tx.counterpartyName || tx.counterpartyUpi || tx.counterpartyPhone || 'Unknown';
};

export default Transaction;
