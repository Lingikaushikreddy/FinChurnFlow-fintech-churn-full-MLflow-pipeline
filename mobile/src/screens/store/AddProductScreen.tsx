/**
 * AddProductScreen - Add or edit product
 * Features: image picker (camera + gallery), product form (name, description, price, stock, SKU),
 * category selector, price type selector (fixed, market rate, call for price),
 * price unit selector (per kg, per piece, etc.), save with validation, edit mode support
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  HelperText,
  Menu,
  Divider,
  Switch,
  Chip,
  SegmentedButtons,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';

import { AppDispatch, RootState } from '../../store';
import {
  createProduct,
  updateProduct,
  fetchCategories,
  Product,
  Category,
} from '../../store/slices/productsSlice';
import { colors, spacing, shadows } from '../../theme';

type RouteParams = {
  AddProduct: { product?: Product };
};

type PriceType = 'fixed' | 'market_rate' | 'call_for_price';

const PRICE_UNITS = [
  { value: 'piece', label: 'Per Piece', icon: 'cube-outline' },
  { value: 'kg', label: 'Per Kg', icon: 'weight-kilogram' },
  { value: 'gram', label: 'Per Gram', icon: 'weight' },
  { value: 'liter', label: 'Per Liter', icon: 'cup-water' },
  { value: 'meter', label: 'Per Meter', icon: 'ruler' },
  { value: 'dozen', label: 'Per Dozen', icon: 'dice-multiple' },
  { value: 'pack', label: 'Per Pack', icon: 'package-variant' },
  { value: 'set', label: 'Per Set', icon: 'set-all' },
];

const AddProductScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'AddProduct'>>();
  const dispatch = useDispatch<AppDispatch>();

  const { categories, isLoading } = useSelector((state: RootState) => state.products);
  const editProduct = route.params?.product;

  const [name, setName] = useState(editProduct?.name || '');
  const [description, setDescription] = useState(editProduct?.description || '');
  const [price, setPrice] = useState(editProduct?.price?.toString() || '');
  const [stock, setStock] = useState(editProduct?.stock?.toString() || '0');
  const [sku, setSku] = useState((editProduct as any)?.sku || '');
  const [categoryId, setCategoryId] = useState(editProduct?.categoryId || '');
  const [images, setImages] = useState<string[]>(editProduct?.images || []);
  const [isActive, setIsActive] = useState(editProduct?.isActive ?? true);
  const [priceType, setPriceType] = useState<PriceType>(
    (editProduct as any)?.priceType || 'fixed'
  );
  const [priceUnit, setPriceUnit] = useState(
    (editProduct as any)?.priceUnit || 'piece'
  );

  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [unitMenuVisible, setUnitMenuVisible] = useState(false);
  const [imagePickerMenuVisible, setImagePickerMenuVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(fetchCategories());
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t('store.errors.nameRequired');
    }

    if (priceType === 'fixed') {
      if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        newErrors.price = t('store.errors.priceInvalid');
      }
    }

    if (stock && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
      newErrors.stock = t('store.errors.stockInvalid');
    }

    if (sku && sku.trim().length < 2) {
      newErrors.sku = t('store.errors.skuInvalid', { defaultValue: 'SKU must be at least 2 characters' });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const productData = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: priceType === 'fixed' ? parseFloat(price) : 0,
      stock: parseInt(stock) || 0,
      sku: sku.trim() || undefined,
      category_id: categoryId || undefined,
      images: images.length > 0 ? images : undefined,
      is_active: isActive,
      price_type: priceType,
      price_unit: priceUnit,
    };

    try {
      if (editProduct) {
        await dispatch(updateProduct({ id: editProduct.id, data: productData })).unwrap();
      } else {
        await dispatch(createProduct(productData)).unwrap();
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error || t('store.errors.saveFailed'));
    }
  };

  const handlePickImageFromGallery = () => {
    setImagePickerMenuVisible(false);
    if (images.length >= 4) {
      Alert.alert(t('common.error'), t('store.errors.maxImages'));
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
      },
      (response: ImagePickerResponse) => {
        if (response.assets && response.assets[0]?.uri) {
          setImages([...images, response.assets[0].uri]);
        }
      }
    );
  };

  const handlePickImageFromCamera = () => {
    setImagePickerMenuVisible(false);
    if (images.length >= 4) {
      Alert.alert(t('common.error'), t('store.errors.maxImages'));
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
      },
      (response: ImagePickerResponse) => {
        if (response.assets && response.assets[0]?.uri) {
          setImages([...images, response.assets[0].uri]);
        }
      }
    );
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const getSelectedCategory = (): string => {
    if (!categoryId) return t('store.selectCategory');
    const cat = categories.find((c: Category) => c.id === categoryId);
    return cat?.name || t('store.selectCategory');
  };

  const getSelectedUnit = (): string => {
    const unit = PRICE_UNITS.find((u) => u.value === priceUnit);
    return unit?.label || 'Per Piece';
  };

  const getPriceTypeLabel = (type: PriceType): string => {
    switch (type) {
      case 'fixed':
        return t('store.priceFixed', { defaultValue: 'Fixed Price' });
      case 'market_rate':
        return t('store.priceMarketRate', { defaultValue: 'Market Rate' });
      case 'call_for_price':
        return t('store.priceCallForPrice', { defaultValue: 'Call for Price' });
      default:
        return '';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Images Section */}
        <Text style={styles.sectionTitle}>{t('store.productImages')}</Text>
        <View style={styles.imagesContainer}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.productImage} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => handleRemoveImage(index)}
              >
                <Icon name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 4 && (
            <Menu
              visible={imagePickerMenuVisible}
              onDismiss={() => setImagePickerMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={styles.addImageBtn}
                  onPress={() => setImagePickerMenuVisible(true)}
                >
                  <Icon name="camera-plus" size={32} color={colors.textSecondary} />
                  <Text style={styles.addImageText}>{t('store.addImage')}</Text>
                </TouchableOpacity>
              }
            >
              <Menu.Item
                leadingIcon="camera"
                onPress={handlePickImageFromCamera}
                title={t('store.takePhoto', { defaultValue: 'Take Photo' })}
              />
              <Menu.Item
                leadingIcon="image"
                onPress={handlePickImageFromGallery}
                title={t('store.chooseFromGallery', { defaultValue: 'Choose from Gallery' })}
              />
            </Menu>
          )}
        </View>

        {/* Product Details */}
        <Text style={styles.sectionTitle}>{t('store.productDetails')}</Text>
        <Surface style={styles.formCard}>
          <TextInput
            label={t('store.productName') + ' *'}
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            error={!!errors.name}
          />
          {errors.name && <HelperText type="error">{errors.name}</HelperText>}

          <TextInput
            label={t('store.description')}
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          <TextInput
            label={t('store.sku', { defaultValue: 'SKU / Product Code' })}
            value={sku}
            onChangeText={setSku}
            mode="outlined"
            style={styles.input}
            autoCapitalize="characters"
            error={!!errors.sku}
            left={<TextInput.Icon icon="barcode" />}
            placeholder="e.g., PROD-001"
          />
          {errors.sku && <HelperText type="error">{errors.sku}</HelperText>}

          {/* Category Dropdown */}
          <Menu
            visible={categoryMenuVisible}
            onDismiss={() => setCategoryMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setCategoryMenuVisible(true)}
              >
                <Text style={styles.dropdownLabel}>{t('store.category')}</Text>
                <View style={styles.dropdownContent}>
                  <Text style={styles.dropdownText}>{getSelectedCategory()}</Text>
                  <Icon name="chevron-down" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => {
                setCategoryId('');
                setCategoryMenuVisible(false);
              }}
              title={t('store.noCategory')}
            />
            <Divider />
            {categories.map((cat: Category) => (
              <Menu.Item
                key={cat.id}
                onPress={() => {
                  setCategoryId(cat.id);
                  setCategoryMenuVisible(false);
                }}
                title={cat.name}
                leadingIcon={categoryId === cat.id ? 'check' : undefined}
              />
            ))}
          </Menu>
        </Surface>

        {/* Pricing Section */}
        <Text style={styles.sectionTitle}>{t('store.pricing', { defaultValue: 'Pricing' })}</Text>
        <Surface style={styles.formCard}>
          {/* Price Type Selector */}
          <Text style={styles.fieldLabel}>
            {t('store.priceType', { defaultValue: 'Price Type' })}
          </Text>
          <SegmentedButtons
            value={priceType}
            onValueChange={(value) => setPriceType(value as PriceType)}
            buttons={[
              { value: 'fixed', label: t('store.fixed', { defaultValue: 'Fixed' }), icon: 'tag' },
              { value: 'market_rate', label: t('store.market', { defaultValue: 'Market' }), icon: 'chart-line' },
              { value: 'call_for_price', label: t('store.callPrice', { defaultValue: 'Call' }), icon: 'phone' },
            ]}
            style={styles.segmentedButtons}
          />

          {/* Price Input (only for fixed) */}
          {priceType === 'fixed' && (
            <View style={styles.priceRow}>
              <View style={styles.priceInput}>
                <TextInput
                  label={t('store.price') + ' *'}
                  value={price}
                  onChangeText={setPrice}
                  mode="outlined"
                  keyboardType="numeric"
                  left={<TextInput.Affix text="₹" />}
                  error={!!errors.price}
                />
                {errors.price && <HelperText type="error">{errors.price}</HelperText>}
              </View>
            </View>
          )}

          {priceType === 'market_rate' && (
            <Surface style={styles.infoBox}>
              <Icon name="information-outline" size={18} color={colors.info} />
              <Text style={styles.infoText}>
                {t('store.marketRateHint', {
                  defaultValue: 'Price will show as "Market Rate" - update daily as needed',
                })}
              </Text>
            </Surface>
          )}

          {priceType === 'call_for_price' && (
            <Surface style={styles.infoBox}>
              <Icon name="information-outline" size={18} color={colors.info} />
              <Text style={styles.infoText}>
                {t('store.callForPriceHint', {
                  defaultValue: 'Customers will see "Call for Price" and your contact number',
                })}
              </Text>
            </Surface>
          )}

          {/* Price Unit Selector */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
            {t('store.priceUnit', { defaultValue: 'Price Unit' })}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.unitScrollView}
            contentContainerStyle={styles.unitContainer}
          >
            {PRICE_UNITS.map((unit) => (
              <Chip
                key={unit.value}
                selected={priceUnit === unit.value}
                onPress={() => setPriceUnit(unit.value)}
                icon={unit.icon}
                style={styles.unitChip}
                textStyle={styles.unitChipText}
              >
                {unit.label}
              </Chip>
            ))}
          </ScrollView>
        </Surface>

        {/* Stock Section */}
        <Text style={styles.sectionTitle}>{t('store.stockInfo', { defaultValue: 'Stock & Inventory' })}</Text>
        <Surface style={styles.formCard}>
          <TextInput
            label={t('store.stock')}
            value={stock}
            onChangeText={setStock}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            error={!!errors.stock}
            left={<TextInput.Icon icon="package-variant" />}
          />
          {errors.stock && <HelperText type="error">{errors.stock}</HelperText>}

          {/* Active Toggle */}
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>{t('store.productActive')}</Text>
              <Text style={styles.switchHint}>{t('store.activeHint')}</Text>
            </View>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>
        </Surface>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.submitBtn}
          contentStyle={styles.submitBtnContent}
        >
          {editProduct ? t('store.updateProduct') : t('store.addProduct')}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  imageWrapper: {
    position: 'relative',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formCard: {
    padding: spacing.md,
    borderRadius: 12,
    ...shadows.sm,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  segmentedButtons: {
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  priceInput: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '20',
    marginBottom: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },
  unitScrollView: {
    marginBottom: spacing.sm,
  },
  unitContainer: {
    gap: spacing.sm,
  },
  unitChip: {
    marginRight: 0,
  },
  unitChipText: {
    fontSize: 12,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  dropdownLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  switchHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  submitBtn: {
    marginTop: spacing.xl,
  },
  submitBtnContent: {
    paddingVertical: spacing.sm,
  },
});

export default AddProductScreen;
