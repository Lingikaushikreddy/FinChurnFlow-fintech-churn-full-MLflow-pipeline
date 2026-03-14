/**
 * CreditEntry - Khaata/Udhaar ledger entry model
 * Matches backend CreditEntry model
 */

export type CreditDirection = 'credit' | 'debit';
export type CreditSource = 'voice' | 'manual' | 'ai';

export interface CreditEntry {
  id: string;
  merchant_id: string;
  customer_name: string;
  customer_phone?: string;
  amount: number;
  direction: CreditDirection;
  description?: string;
  item?: string;
  is_settled: boolean;
  settled_at?: string;
  source: CreditSource;
  created_at: string;
  updated_at: string;
}

export interface CustomerLedgerSummary {
  customer_name: string;
  customer_phone?: string;
  total_credit: number;
  total_debit: number;
  net_balance: number;
  entry_count: number;
  unsettled_count: number;
  last_entry_at?: string;
}

export interface KhaataOverview {
  total_outstanding: number;
  total_customers: number;
  customers_with_dues: number;
  customers: CustomerLedgerSummary[];
}

// Helper functions
export const getDirectionLabel = (direction: CreditDirection): string => {
  return direction === 'debit' ? 'Udhaar (Liya)' : 'Jama (Diya)';
};

export const getDirectionColor = (direction: CreditDirection): string => {
  return direction === 'debit' ? '#E53E3E' : '#38A169';
};

export const formatKhaataAmount = (amount: number, direction: CreditDirection): string => {
  const sign = direction === 'debit' ? '+' : '-';
  return `${sign}₹${amount.toLocaleString('en-IN')}`;
};
