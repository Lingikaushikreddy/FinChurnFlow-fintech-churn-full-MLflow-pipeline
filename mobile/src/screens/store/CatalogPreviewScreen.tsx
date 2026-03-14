/**
 * CatalogPreviewScreen - Preview and share public catalog
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Share,
  Linking,
} from 'react-native';
import {
  Text,
  Surface,
  Button,
  Divider,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';

import { RootState } from '../../store';
import { storeAPI } from '../../services/api';
import { colors, spacing, shadows } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { Product } from '../../store/slices/productsSlice';

const CatalogPreviewScreen: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useSelector((state: RootState) => state.merchant);

  const [catalogUrl, setCatalogUrl] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setIsLoading(true);
      const qrData = await storeAPI.getCatalogQR();
      setCatalogUrl(qrData.url || `https://nano.app/store/${profile?.id}`);

      const catalogData = await storeAPI.getPublicCatalog(profile?.id || '');
      setProducts(catalogData.products || []);
    } catch (error) {
      console.error('Failed to load catalog:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('store.shareMessage', {
          businessName: profile?.businessName || t('store.myStore'),
          url: catalogUrl,
        }),
        url: catalogUrl,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleOpenCatalog = () => {
    if (catalogUrl) {
      Linking.openURL(catalogUrl);
    }
  };

  const handleWhatsAppShare = () => {
    const message = t('store.whatsappMessage', {
      businessName: profile?.businessName || t('store.myStore'),
      url: catalogUrl,
    });
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* QR Code Section */}
        <Surface style={styles.qrCard}>
          <Text style={styles.qrTitle}>{t('store.catalogQR')}</Text>
          <Text style={styles.qrSubtitle}>{t('store.catalogQRHint')}</Text>

          <View style={styles.qrContainer}>
            {catalogUrl ? (
              <QRCode
                value={catalogUrl}
                size={180}
                color={colors.textPrimary}
                backgroundColor={colors.surface}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Icon name="qrcode" size={100} color={colors.textDisabled} />
              </View>
            )}
          </View>

          {/* Store Name */}
          <Text style={styles.storeName}>
            {profile?.businessName || t('store.myStore')}
          </Text>

          {/* Share Buttons */}
          <View style={styles.shareButtons}>
            <Button
              mode="contained"
              icon="share-variant"
              onPress={handleShare}
              style={styles.shareBtn}
            >
              {t('common.share')}
            </Button>
            <IconButton
              icon="whatsapp"
              mode="contained"
              containerColor={colors.success}
              iconColor={colors.textInverse}
              size={28}
              onPress={handleWhatsAppShare}
            />
          </View>

          {/* Open Link */}
          <Button
            mode="text"
            icon="open-in-new"
            onPress={handleOpenCatalog}
            style={styles.openBtn}
          >
            {t('store.openCatalog')}
          </Button>
        </Surface>

        <Divider style={styles.sectionDivider} />

        {/* Catalog Preview */}
        <Text style={styles.sectionTitle}>{t('store.catalogPreview')}</Text>
        <Text style={styles.sectionSubtitle}>
          {t('store.catalogPreviewHint', { count: products.length })}
        </Text>

        {/* Product Preview */}
        <View style={styles.previewContainer}>
          {products.length === 0 ? (
            <Surface style={styles.emptyPreview}>
              <Icon name="package-variant" size={48} color={colors.textDisabled} />
              <Text style={styles.emptyText}>{t('store.noProductsInCatalog')}</Text>
            </Surface>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productScroll}
            >
              {products.slice(0, 6).map((product) => (
                <Surface key={product.id} style={styles.productCard}>
                  <View style={styles.productImageContainer}>
                    {product.images && product.images.length > 0 ? (
                      <Image
                        source={{ uri: product.images[0] }}
                        style={styles.productImage}
                      />
                    ) : (
                      <View style={styles.productPlaceholder}>
                        <Icon name="image-off" size={24} color={colors.textDisabled} />
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.productPrice}>
                      {formatCurrency(product.price)}
                    </Text>
                  </View>
                </Surface>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Tips */}
        <Surface style={styles.tipsCard}>
          <View style={styles.tipHeader}>
            <Icon name="lightbulb-outline" size={24} color={colors.warning} />
            <Text style={styles.tipTitle}>{t('store.tips')}</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text style={styles.tipText}>{t('store.tip1')}</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text style={styles.tipText}>{t('store.tip2')}</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text style={styles.tipText}>{t('store.tip3')}</Text>
          </View>
        </Surface>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  qrCard: {
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    ...shadows.md,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  qrSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  qrContainer: {
    marginVertical: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    ...shadows.sm,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  shareButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  shareBtn: {
    flex: 1,
  },
  openBtn: {
    marginTop: spacing.md,
  },
  sectionDivider: {
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  previewContainer: {
    marginBottom: spacing.lg,
  },
  emptyPreview: {
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  productScroll: {
    paddingVertical: spacing.sm,
  },
  productCard: {
    width: 140,
    marginRight: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.sm,
  },
  productImageContainer: {
    height: 100,
    backgroundColor: colors.surfaceVariant,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: spacing.sm,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  tipsCard: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
});

export default CatalogPreviewScreen;
