/**
 * Database Schema - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

// Mock schema export for development
export const schema = {
  version: 1,
  tables: [
    'transactions',
    'products',
    'categories',
    'contacts',
    'employees',
    'orders',
    'sync_queue',
  ],
};

export default schema;
