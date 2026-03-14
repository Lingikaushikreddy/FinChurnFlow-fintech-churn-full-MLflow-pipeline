/**
 * Product Model - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

export interface Product {
  id: string;
  serverId: string | null;
  merchantId: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  categoryId: string | null;
  isActive: boolean;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Helper functions that were getters on the class
export const getDisplayPrice = (price: number): string => {
  return `₹${price.toLocaleString('en-IN')}`;
};

export const getPrimaryImage = (images: string[]): string | null => {
  return images.length > 0 ? images[0] : null;
};

export const isInStock = (stock: number): boolean => {
  return stock > 0;
};

export const isLowStock = (stock: number): boolean => {
  return stock > 0 && stock <= 5;
};

export const isOutOfStock = (stock: number): boolean => {
  return stock === 0;
};

export const getStockStatus = (stock: number): 'in_stock' | 'low_stock' | 'out_of_stock' => {
  if (stock === 0) return 'out_of_stock';
  if (stock <= 5) return 'low_stock';
  return 'in_stock';
};

export default Product;
