/**
 * Payment Links Screen - Create and manage payment links
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Share,
  Alert,
  RefreshControl,
  SafeAreaView,
  Clipboard,
} from 'react-native';
import {
  Text,
  Surface,
  Button,
  TextInput,
  FAB,
  Portal,
  Modal,
  IconButton,
  Chip,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { paymentLinksAPI } from '../../services/api';
import { colors, spacing, shadows } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

interface PaymentLink {
  id: string;
  amount: number | null;
  description: string | null;
  short_code: string;
  short_url: string;
  status: string;
  payment_count: number;
  total_collected: number;
  created_at: string;
}

const PaymentLinksScreen: React.FC = () => {
  const { t } = useTranslation();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [showSnack, setShowSnack] = useState(false);

  const loadLinks = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await paymentLinksAPI.list({ page: 1, page_size: 50 });
      setLinks(response.items);
    } catch (error) {
      console.error('Failed to load links:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const data: any = {};
      if (amount) data.amount = parseFloat(amount);
      if (description) data.description = description;

      const newLink = await paymentLinksAPI.create(data);
      setLinks([newLink, ...links]);
      setShowCreateModal(false);
      setAmount('');
      setDescription('');

      // Automatically share the new link
      await Share.share({
        message: `Pay via this link: ${newLink.short_url}${
          newLink.amount ? ` (${formatCurrency(newLink.amount)})` : ''
        }`,
      });
    } catch (error) {
      console.error('Failed to create link:', error);
      Alert.alert(t('common.error'), 'Failed to create payment link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleShare = async (link: PaymentLink) => {
    try {
      await Share.share({
        message: `Pay via this link: ${link.short_url}${
          link.amount ? ` (${formatCurrency(link.amount)})` : ''
        }`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleCopyLink = (link: PaymentLink) => {
    Clipboard.setString(link.short_url);
    setSnackMessage('Link copied to clipboard');
    setShowSnack(true);
  };

  const handleDisable = async (link: PaymentLink) => {
    Alert.alert(
      'Disable Link',
      'Are you sure you want to disable this payment link?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentLinksAPI.disable(link.id);
              setLinks(
                links.map((l) =>
                  l.id === link.id ? { ...l, status: 'disabled' } : l
                )
              );
              setSnackMessage('Payment link disabled');
              setShowSnack(true);
            } catch (error) {
              console.error('Failed to disable link:', error);
              Alert.alert(t('common.error'), 'Failed to disable payment link');
            }
          },
        },
      ]
    );
  };

  const handleDeleteLink = async (link: PaymentLink) => {
    Alert.alert(
      t('common.delete'),
      'Are you sure you want to delete this payment link? This cannot be undone.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentLinksAPI.disable(link.id);
              setLinks(links.filter((l) => l.id !== link.id));
              setSnackMessage('Payment link deleted');
              setShowSnack(true);
            } catch (error) {
              console.error('Failed to delete link:', error);
              Alert.alert(t('common.error'), 'Failed to delete payment link');
            }
          },
        },
      ]
    );
  };

  const activeCount = links.filter((l) => l.status === 'active').length;
  const totalCollected = links.reduce((sum, l) => sum + l.total_collected, 0);

  const renderSummary = () => {
    if (links.length === 0) return null;
    return (
      <View style={styles.summaryRow}>
        <Surface style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>Active Links</Text>
        </Surface>
        <Surface style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{links.length}</Text>
          <Text style={styles.summaryLabel}>Total Links</Text>
        </Surface>
        <Surface style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(totalCollected)}
          </Text>
          <Text style={styles.summaryLabel}>Collected</Text>
        </Surface>
      </View>
    );
  };

  const renderLinkItem = ({ item }: { item: PaymentLink }) => (
    <Surface style={styles.linkCard}>
      <View style={styles.linkHeader}>
        <View style={styles.linkInfo}>
          <Text style={styles.linkAmount}>
            {item.amount ? formatCurrency(item.amount) : t('payments.amount') + ' (Any)'}
          </Text>
          {item.description && (
            <Text style={styles.linkDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
        <Chip
          mode="flat"
          style={[
            styles.statusChip,
            { backgroundColor: item.status === 'active' ? colors.success + '20' : colors.error + '20' },
          ]}
          textStyle={{ color: item.status === 'active' ? colors.success : colors.error }}
        >
          {item.status}
        </Chip>
      </View>

      <View style={styles.linkUrl}>
        <Icon name="link-variant" size={16} color={colors.textSecondary} />
        <Text style={styles.urlText} numberOfLines={1}>
          {item.short_url}
        </Text>
        <IconButton
          icon="content-copy"
          size={16}
          onPress={() => handleCopyLink(item)}
          style={styles.copyBtn}
        />
      </View>

      <View style={styles.linkStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.payment_count}</Text>
          <Text style={styles.statLabel}>Payments</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatCurrency(item.total_collected)}</Text>
          <Text style={styles.statLabel}>{t('home.collection')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {new Date(item.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
          <Text style={styles.statLabel}>Created</Text>
        </View>
      </View>

      <View style={styles.linkActions}>
        <Button
          mode="contained"
          compact
          icon="share-variant"
          onPress={() => handleShare(item)}
          style={styles.shareBtn}
          disabled={item.status !== 'active'}
        >
          {t('common.share')}
        </Button>
        {item.status === 'active' ? (
          <IconButton
            icon="link-off"
            size={20}
            iconColor={colors.warning}
            onPress={() => handleDisable(item)}
          />
        ) : (
          <IconButton
            icon="delete-outline"
            size={20}
            iconColor={colors.error}
            onPress={() => handleDeleteLink(item)}
          />
        )}
      </View>
    </Surface>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="link-variant-off" size={64} color={colors.textDisabled} />
      <Text style={styles.emptyTitle}>{t('payments.noLinks')}</Text>
      <Text style={styles.emptyText}>
        {t('payments.createLinkHint')}
      </Text>
      <Button
        mode="contained"
        icon="plus"
        onPress={() => setShowCreateModal(true)}
        style={styles.emptyButton}
      >
        {t('payments.createLink')}
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={links}
          renderItem={renderLinkItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderSummary}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadLinks(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}

      <FAB
        icon="plus"
        label={t('payments.createLink')}
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      />

      {/* Create Modal */}
      <Portal>
        <Modal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>{t('payments.createLink')}</Text>

          <TextInput
            label={`${t('payments.amount')} (₹) - ${t('payments.optional')}`}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Affix text="₹" />}
          />

          <TextInput
            label={`${t('payments.description')} - ${t('payments.optional')}`}
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={2}
          />

          <Text style={styles.quickAmountsLabel}>{t('payments.quickAmounts')}</Text>
          <View style={styles.quickAmounts}>
            {['100', '200', '500', '1000'].map((amt) => (
              <Button
                key={amt}
                mode={amount === amt ? 'contained' : 'outlined'}
                compact
                onPress={() => setAmount(amt)}
                style={styles.quickBtn}
              >
                ₹{amt}
              </Button>
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowCreateModal(false)}
              style={styles.modalBtn}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleCreate}
              loading={isCreating}
              disabled={isCreating}
              style={styles.modalBtn}
              icon="share-variant"
            >
              Create & {t('common.share')}
            </Button>
          </View>
        </Modal>
      </Portal>

      <Snackbar
        visible={showSnack}
        onDismiss={() => setShowSnack(false)}
        duration={2000}
      >
        {snackMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.sm,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  linkCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  linkInfo: {
    flex: 1,
  },
  linkAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  linkDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusChip: {
    height: 24,
  },
  linkUrl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  urlText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  copyBtn: {
    margin: 0,
    marginLeft: spacing.xs,
  },
  linkStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  linkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareBtn: {
    flex: 1,
    marginRight: spacing.sm,
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
    marginHorizontal: spacing.lg,
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  modalContent: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  quickAmountsLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickBtn: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
});

export default PaymentLinksScreen;
