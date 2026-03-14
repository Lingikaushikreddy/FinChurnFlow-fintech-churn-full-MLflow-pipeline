/**
 * Category Model - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

export interface Category {
  id: string;
  serverId: string | null;
  merchantId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  synced: boolean;
  createdAt: Date;
}

// Helper functions that were getters on the class
export const isRootCategory = (category: Category): boolean => {
  return !category.parentId;
};

export default Category;
