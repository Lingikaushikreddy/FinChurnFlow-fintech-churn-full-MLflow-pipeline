/**
 * Database Models barrel export - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

export type { Transaction, TransactionType, TransactionStatus } from './Transaction';
export type { Product } from './Product';
export type { Contact } from './Contact';
export type { Employee } from './Employee';
export type { Order, OrderStatus, OrderItem } from './Order';
export type { Category } from './Category';
export type { SyncQueue, SyncOperation } from './SyncQueue';
export type { CreditEntry, CreditDirection, CreditSource, CustomerLedgerSummary, KhaataOverview } from './CreditEntry';

// Re-export helper functions
export * from './Transaction';
export * from './Product';
export * from './Contact';
export * from './Employee';
export * from './Order';
export * from './Category';
export * from './SyncQueue';
export * from './CreditEntry';
