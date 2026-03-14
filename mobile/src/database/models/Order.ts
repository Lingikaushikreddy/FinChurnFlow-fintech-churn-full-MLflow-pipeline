/**
 * Order Model - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  serverId: string | null;
  merchantId: string;
  customerPhone: string;
  customerName: string | null;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentId: string | null;
  notes: string | null;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Helper functions that were getters on the class
export const getDisplayTotal = (total: number): string => {
  return `₹${total.toLocaleString('en-IN')}`;
};

export const getCustomerDisplay = (order: Order): string => {
  return order.customerName || order.customerPhone;
};

export const getItemCount = (items: OrderItem[]): number => {
  return items.reduce((sum, item) => sum + item.quantity, 0);
};

export const isPending = (status: OrderStatus): boolean => {
  return status === 'pending';
};

export const isConfirmed = (status: OrderStatus): boolean => {
  return status === 'confirmed';
};

export const isCompleted = (status: OrderStatus): boolean => {
  return status === 'completed';
};

export const isCancelled = (status: OrderStatus): boolean => {
  return status === 'cancelled';
};

export const isActive = (status: OrderStatus): boolean => {
  return status === 'pending' || status === 'confirmed';
};

export const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case 'pending':
      return '#F59E0B'; // amber
    case 'confirmed':
      return '#3B82F6'; // blue
    case 'completed':
      return '#10B981'; // green
    case 'cancelled':
      return '#EF4444'; // red
    default:
      return '#6B7280'; // gray
  }
};

export const getItemsSummary = (items: OrderItem[]): string => {
  const count = getItemCount(items);
  return `${count} item${count !== 1 ? 's' : ''}`;
};

export default Order;
