/**
 * useProducts Hook - Product management utilities
 */

import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchProducts,
  fetchCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  setSearchQuery,
  setSelectedCategory,
  clearProducts,
  Product,
  Category,
} from '../store/slices/productsSlice';

interface UseProductsOptions {
  autoFetch?: boolean;
  categoryId?: string;
}

export const useProducts = (options: UseProductsOptions = {}) => {
  const { autoFetch = true, categoryId } = options;
  const dispatch = useDispatch<AppDispatch>();

  const {
    items: products,
    categories,
    selectedCategory,
    total,
    page,
    isLoading,
    error,
    searchQuery,
  } = useSelector((state: RootState) => state.products);

  const loadProducts = useCallback(
    (refresh = false) => {
      return dispatch(
        fetchProducts({
          page: refresh ? 1 : page,
          search: searchQuery,
          categoryId: categoryId || selectedCategory || undefined,
        })
      );
    },
    [dispatch, page, searchQuery, categoryId, selectedCategory]
  );

  const loadCategories = useCallback(() => {
    return dispatch(fetchCategories());
  }, [dispatch]);

  const addProduct = useCallback(
    (data: {
      name: string;
      description?: string;
      price: number;
      stock?: number;
      category_id?: string;
      images?: string[];
    }) => {
      return dispatch(createProduct(data));
    },
    [dispatch]
  );

  const editProduct = useCallback(
    (id: string, data: Partial<Product>) => {
      return dispatch(updateProduct({ id, data }));
    },
    [dispatch]
  );

  const removeProduct = useCallback(
    (id: string) => {
      return dispatch(deleteProduct(id));
    },
    [dispatch]
  );

  const search = useCallback(
    (query: string) => {
      dispatch(setSearchQuery(query));
    },
    [dispatch]
  );

  const selectCategory = useCallback(
    (id: string | null) => {
      dispatch(setSelectedCategory(id));
    },
    [dispatch]
  );

  const loadMore = useCallback(() => {
    if (products.length < total && !isLoading) {
      dispatch(
        fetchProducts({
          page: page + 1,
          search: searchQuery,
          categoryId: categoryId || selectedCategory || undefined,
        })
      );
    }
  }, [dispatch, products.length, total, isLoading, page, searchQuery, categoryId, selectedCategory]);

  const refresh = useCallback(() => {
    dispatch(clearProducts());
    return loadProducts(true);
  }, [dispatch, loadProducts]);

  useEffect(() => {
    if (autoFetch) {
      loadProducts(true);
      loadCategories();
    }
  }, [autoFetch]);

  return {
    // State
    products,
    categories,
    selectedCategory,
    total,
    page,
    isLoading,
    error,
    searchQuery,
    hasMore: products.length < total,

    // Actions
    loadProducts,
    loadCategories,
    addProduct,
    editProduct,
    removeProduct,
    search,
    selectCategory,
    loadMore,
    refresh,
  };
};

export default useProducts;
