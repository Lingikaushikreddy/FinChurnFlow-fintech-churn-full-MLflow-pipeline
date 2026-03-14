/**
 * ProductListScreen - Product catalog management
 * Features: grid layout with product cards, search bar, scrollable category filter,
 * stock status indicators (in stock, low, out of stock), product menu (edit, delete, update stock),
 * pull-to-refresh, infinite scroll pagination, FAB to add new product
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Image,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Surface,
  Searchbar,
  FAB,
  Chip,
  IconButton,
  ActivityIndicator,
  Menu,
  Divider,
  TextInput,
  Portal,
  Modal,
  Button,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { AppDispatch, RootState } from '../../store';
import {
  fetchProducts,
  fetchCategories,
  deleteProduct,
  updateProduct,
  setSearchQuery,
  setSelectedCategory,
  Product,
  Category,
} from '../../store/slices/productsSlice';
import { colors, spacing, shadows } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

const LOW_STOCK_THRESHOLD = 5;

const ProductListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();

  const {
    items,
    categories,
    selectedCategory,
    isLoading,
    searchQuery,
    total,
    page,
  } = useSelector((state: RootState) => state.products);

  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockUpdateProduct, setStockUpdateProduct] = useState<Product | null>(null);
  const [newStockValue, setNewStockValue] = useState('');

  const loadProducts = useCallback(
    (refresh = false) => {
      dispatch(
        fetchProducts({
          page: refresh ? 1 : page,
          search: searchQuery,
          categoryId: selectedCategory || undefined,
        })
      );
    },
    [dispatch, page, searchQuery, selectedCategory]
  );

  useEffect(() => {
    loadProducts(true);
    dispatch(fetchCategories());
  }, [searchQuery, selectedCategory]);

  const handleSearch = (query: string) => {
    dispatch(setSearchQuery(query));
  };

  const handleCategorySelect = (categoryId: string | null) => {
    dispatch(setSelectedCategory(categoryId));
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      t('store.deleteProduct'),
      t('store.deleteConfirm', { name: product.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => dispatch(deleteProduct(product.id)),
        },
      ]
    );
  };

  const handleEdit = (product: Product) => {
    setMenuVisible(null);
    navigation.navigate('AddProduct', { product });
  };

  const handleUpdateStock = (product: Product) => {
    setMenuVisible(null);
    setStockUpdateProduct(product);
    setNewStockValue(product.stock.toString());
    setStockModalVisible(true);
  };

  const submitStockUpdate = async () => {
    if (!stockUpdateProduct) return;
    const stockVal = parseInt(newStockValue);
    if (isNaN(stockVal) || stockVal < 0) {
      Alert.alert(t('common.error'), t('store.errors.stockInvalid'));
      return;
    }

    try {
      await dispatch(
        updateProduct({
          id: stockUpdateProduct.id,
          data: { stock: stockVal },
        })
      ).unwrap();
      setStockModalVisible(false);
      setStockUpdateProduct(null);
    } catch (error: any) {
      Alert.alert(t('common.error'), error || t('store.errors.saveFailed'));
    }
  };

  const getStockStatus = (stock: number): { label: string; color: string; icon: string } => {
    if (stock <= 0) {
      return {
        label: t('store.outOfStock'),
        color: colors.error,
        icon: 'alert-circle',
      };
    }
    if (stock <= LOW_STOCK_THRESHOLD) {
      return {
        label: t('store.lowStock', { defaultValue: `Low Stock (${stock})` }),
        color: colors.warning,
        icon: 'alert',
      };
    }
    return {
      label: t('store.inStock', { count: stock }),
      color: colors.success,
      icon: 'check-circle',
    };
  };

  const renderCategoryChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScrollView}
      contentContainerStyle={styles.chipContainer}
    >
      <Chip
        selected={selectedCategory === null}
        onPress={() => handleCategorySelect(null)}
        style={styles.chip}
        textStyle={styles.chipText}
      >
        {t('common.all')}
      </Chip>
      {categories.map((cat: Category) => (
        <Chip
          key={cat.id}
          selected={selectedCategory === cat.id}
          onPress={() => handleCategorySelect(cat.id)}
          style={styles.chip}
          textStyle={styles.chipText}
        >
          {cat.name}
        </Chip>
      ))}
    </ScrollView>
  );

  const renderProduct = ({ item }: { item: Product }) => {
    const stockStatus = getStockStatus(item.stock);

    return (
      <TouchableOpacity
        style={styles.productCardWrapper}
        activeOpacity={0.7}
        onPress={() => handleEdit(item)}
      >
        <Surface style={styles.productCard}>
          {/* Product Image */}
          <View style={styles.imageContainer}>
            {item.images && item.images.length > 0 ? (
              <Image source={{ uri: item.images[0] }} style={styles.productImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Icon name="image-off" size={32} color={colors.textDisabled} />
              </View>
            )}
            {/* Stock Badge overlay */}
            {item.stock <= LOW_STOCK_THRESHOLD && (
              <View
                style={[
                  styles.stockBadge,
                  { backgroundColor: stockStatus.color },
                ]}
              >
                <Text style={styles.stockBadgeText}>
                  {item.stock <= 0
                    ? t('store.outOfStockShort', { defaultValue: 'Out' })
                    : t('store.lowStockShort', { defaultValue: 'Low' })}
                </Text>
              </View>
            )}
            {!item.isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveText}>{t('store.inactive')}</Text>
              </View>
            )}
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
            <View style={styles.stockRow}>
              <Icon
                name={stockStatus.icon}
                size={14}
                color={stockStatus.color}
              />
              <Text
                style={[
                  styles.stockText,
                  { color: stockStatus.color },
                ]}
              >
                {stockStatus.label}
              </Text>
            </View>
          </View>

          {/* Menu */}
          <Menu
            visible={menuVisible === item.id}
            onDismiss={() => setMenuVisible(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => setMenuVisible(item.id)}
                style={styles.menuButton}
              />
            }
          >
            <Menu.Item
              leadingIcon="pencil"
              onPress={() => handleEdit(item)}
              title={t('common.edit')}
            />
            <Menu.Item
              leadingIcon="package-variant"
              onPress={() => handleUpdateStock(item)}
              title={t('store.updateStock', { defaultValue: 'Update Stock' })}
            />
            <Divider />
            <Menu.Item
              leadingIcon="delete"
              onPress={() => {
                setMenuVisible(null);
                handleDelete(item);
              }}
              title={t('common.delete')}
              titleStyle={{ color: colors.error }}
            />
          </Menu>
        </Surface>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="package-variant" size={64} color={colors.textDisabled} />
      <Text style={styles.emptyTitle}>{t('store.noProducts')}</Text>
      <Text style={styles.emptyText}>{t('store.addProductHint')}</Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoading || items.length === 0) return null;
    return <ActivityIndicator style={styles.footer} />;
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <Searchbar
        placeholder={t('store.searchProducts')}
        value={searchQuery}
        onChangeText={handleSearch}
        style={styles.searchBar}
      />

      {/* Category Chips */}
      {renderCategoryChips()}

      {/* Product Count */}
      <Text style={styles.countText}>
        {total} {t('store.products', { count: total })}
      </Text>

      {/* Products Grid */}
      {isLoading && items.length === 0 ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={items}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && items.length > 0}
              onRefresh={() => loadProducts(true)}
            />
          }
          onEndReached={() => {
            if (items.length < total) {
              dispatch(
                fetchProducts({
                  page: page + 1,
                  search: searchQuery,
                  categoryId: selectedCategory || undefined,
                })
              );
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* Add FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
      />

      {/* Stock Update Modal */}
      <Portal>
        <Modal
          visible={stockModalVisible}
          onDismiss={() => {
            setStockModalVisible(false);
            setStockUpdateProduct(null);
          }}
          contentContainerStyle={styles.stockModalContent}
        >
          <Icon name="package-variant" size={40} color={colors.primary} />
          <Text style={styles.stockModalTitle}>
            {t('store.updateStock', { defaultValue: 'Update Stock' })}
          </Text>
          {stockUpdateProduct && (
            <Text style={styles.stockModalProduct}>{stockUpdateProduct.name}</Text>
          )}
          <TextInput
            label={t('store.newStock', { defaultValue: 'New Stock Quantity' })}
            value={newStockValue}
            onChangeText={setNewStockValue}
            mode="outlined"
            keyboardType="numeric"
            style={styles.stockInput}
          />
          <View style={styles.stockModalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setStockModalVisible(false);
                setStockUpdateProduct(null);
              }}
              style={styles.stockModalBtn}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={submitStockUpdate}
              style={styles.stockModalBtn}
            >
              {t('common.save', { defaultValue: 'Save' })}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    elevation: 0,
    backgroundColor: colors.surface,
  },
  chipScrollView: {
    marginBottom: spacing.sm,
  },
  chipContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    marginRight: 0,
  },
  chipText: {
    fontSize: 12,
  },
  countText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.sm,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  productCardWrapper: {
    flex: 0.48,
    marginBottom: spacing.md,
  },
  productCard: {
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.sm,
  },
  imageContainer: {
    position: 'relative',
    height: 120,
    backgroundColor: colors.surfaceVariant,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadgeText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
  inactiveBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '600',
  },
  productInfo: {
    padding: spacing.sm,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 12,
    marginLeft: 4,
  },
  menuButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  footer: {
    marginVertical: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  stockModalContent: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  stockModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  stockModalProduct: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  stockInput: {
    width: '100%',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
  },
  stockModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    width: '100%',
  },
  stockModalBtn: {
    flex: 1,
  },
});

export default ProductListScreen;
