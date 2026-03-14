/**
 * Payout Screen - Send money to contacts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import {
  Text,
  Surface,
  TextInput,
  Button,
  Avatar,
  ActivityIndicator,
  Portal,
  Modal,
  Chip,
  Divider,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppDispatch, RootState } from '../../store';
import { fetchRecentContacts } from '../../store/slices/contactsSlice';
import { addTransaction } from '../../store/slices/transactionsSlice';
import { payoutsAPI, merchantAPI } from '../../services/api';
import { colors, spacing, shadows } from '../../theme';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface Contact {
  id: string;
  name: string;
  upiId: string | null;
  phone: string | null;
}

interface TransferHistoryItem {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  counterparty_name: string;
  counterparty_upi: string | null;
  reference_id: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warning,
  processing: colors.info,
  completed: colors.success,
  failed: colors.error,
};

const PayoutScreen: React.FC = () => {
  const { t } = useTranslation();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [upiId, setUpiId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transferHistory, setTransferHistory] = useState<TransferHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { recentContacts, isLoading: contactsLoading } = useSelector(
    (state: RootState) => state.contacts
  );

  useEffect(() => {
    dispatch(fetchRecentContacts());
    loadTransferHistory();
  }, [dispatch]);

  const loadTransferHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await payoutsAPI.getHistory({ page: 1, page_size: 20 });
      setTransferHistory(response.items || []);
    } catch (error) {
      console.error('Failed to load transfer history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setUpiId(contact.upiId || '');
  };

  const handleClearContact = () => {
    setSelectedContact(null);
    setUpiId('');
  };

  const validateAndProceed = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid amount');
      return;
    }

    if (!selectedContact && !upiId) {
      Alert.alert(t('common.error'), 'Please select a contact or enter a UPI ID');
      return;
    }

    if (!selectedContact && upiId && !/^[\w.\-]+@[\w]+$/.test(upiId)) {
      Alert.alert(t('common.error'), 'Please enter a valid UPI ID');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmTransfer = () => {
    setShowConfirmModal(false);
    setShowPinModal(true);
  };

  const handleTransfer = async () => {
    if (pin.length < 4) {
      Alert.alert(t('common.error'), 'Please enter your PIN');
      return;
    }

    setIsLoading(true);
    try {
      // Verify PIN first
      await merchantAPI.verifyPin(pin);

      // Process transfer
      const response = await payoutsAPI.transfer({
        contactId: selectedContact?.id,
        upiId: selectedContact ? undefined : upiId,
        amount: parseFloat(amount),
        description: description || undefined,
        pin,
      });

      // Add to transactions
      dispatch(
        addTransaction({
          id: response.transaction_id,
          type: 'payout',
          amount: parseFloat(amount),
          status: response.status,
          counterparty_name: selectedContact?.name || upiId,
          counterparty_upi: selectedContact?.upiId || upiId,
          reference_id: response.reference_id,
          created_at: new Date().toISOString(),
        })
      );

      setShowPinModal(false);
      setPin('');

      Alert.alert(
        t('common.success'),
        t('payouts.transferSuccess', {
          amount: formatCurrency(parseFloat(amount)),
          recipient: selectedContact?.name || upiId,
        }),
        [
          {
            text: t('common.done'),
            onPress: () => {
              setAmount('');
              setDescription('');
              handleClearContact();
              loadTransferHistory();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        t('payouts.transferFailed'),
        error.response?.data?.detail || 'Failed to process transfer'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColor = STATUS_COLORS[status] || colors.textSecondary;
    return (
      <Chip
        mode="flat"
        compact
        style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}
        textStyle={{ color: statusColor, fontSize: 11 }}
      >
        {t(`transactions.status.${status}`, status)}
      </Chip>
    );
  };

  const renderTransferHistoryItem = ({ item }: { item: TransferHistoryItem }) => (
    <Surface style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <Avatar.Text
          size={40}
          label={item.counterparty_name?.charAt(0)?.toUpperCase() || '?'}
          style={[styles.historyAvatar, { backgroundColor: colors.error + '30' }]}
          labelStyle={{ color: colors.error }}
        />
        <View style={styles.historyInfo}>
          <Text style={styles.historyName} numberOfLines={1}>
            {item.counterparty_name}
          </Text>
          <Text style={styles.historyDate}>
            {formatDateTime(item.created_at)}
          </Text>
        </View>
      </View>
      <View style={styles.historyRight}>
        <Text style={[styles.historyAmount, { color: colors.error }]}>
          -{formatCurrency(item.amount)}
        </Text>
        {getStatusBadge(item.status)}
      </View>
    </Surface>
  );

  const renderTransferForm = () => (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            dispatch(fetchRecentContacts());
            loadTransferHistory();
          }}
          colors={[colors.primary]}
        />
      }
    >
      {/* Selected Contact / UPI Input */}
      <Surface style={styles.recipientCard}>
        <Text style={styles.sectionTitle}>{t('payouts.sendTo')}</Text>

        {selectedContact ? (
          <View style={styles.selectedContact}>
            <Avatar.Text
              size={48}
              label={selectedContact.name.charAt(0)}
              style={styles.avatar}
            />
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{selectedContact.name}</Text>
              <Text style={styles.contactUpi}>
                {selectedContact.upiId || selectedContact.phone}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClearContact}>
              <Icon name="close-circle" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TextInput
            label={t('contacts.upiId')}
            value={upiId}
            onChangeText={setUpiId}
            mode="outlined"
            placeholder="name@upi"
            autoCapitalize="none"
            style={styles.input}
            left={<TextInput.Icon icon="at" />}
          />
        )}
      </Surface>

      {/* Recent Contacts */}
      {!selectedContact && (
        <Surface style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>{t('payouts.recent')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Contacts' as never)}
            >
              <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
            </TouchableOpacity>
          </View>

          {contactsLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : recentContacts.length === 0 ? (
            <Text style={styles.emptyText}>No recent contacts</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentContacts.map((contact: any) => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.recentContact}
                  onPress={() => handleSelectContact(contact)}
                >
                  <Avatar.Text
                    size={48}
                    label={contact.name.charAt(0)}
                    style={styles.recentAvatar}
                  />
                  <Text style={styles.recentName} numberOfLines={1}>
                    {contact.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Surface>
      )}

      {/* Amount Input */}
      <Surface style={styles.amountCard}>
        <Text style={styles.sectionTitle}>{t('payouts.amount')}</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            mode="flat"
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        <View style={styles.quickAmounts}>
          {['100', '500', '1000', '2000'].map((amt) => (
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

        <TextInput
          label={`${t('payouts.note')} (${t('payments.optional')})`}
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          style={styles.noteInput}
        />
      </Surface>

      {/* Pay Button */}
      <Button
        mode="contained"
        onPress={validateAndProceed}
        disabled={!amount || (!selectedContact && !upiId)}
        style={styles.payButton}
        contentStyle={styles.payButtonContent}
        labelStyle={styles.payButtonLabel}
        icon="send"
      >
        {t('payouts.pay')} {amount ? formatCurrency(parseFloat(amount)) : '₹0'}
      </Button>

      {/* Transfer History Toggle */}
      <TouchableOpacity
        style={styles.historyToggle}
        onPress={() => setShowHistory(!showHistory)}
        activeOpacity={0.7}
      >
        <View style={styles.historyToggleLeft}>
          <Icon name="history" size={20} color={colors.primary} />
          <Text style={styles.historyToggleText}>Transfer History</Text>
        </View>
        <Icon
          name={showHistory ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Transfer History List */}
      {showHistory && (
        <View style={styles.historySection}>
          {isLoadingHistory ? (
            <ActivityIndicator style={styles.loader} />
          ) : transferHistory.length === 0 ? (
            <View style={styles.emptyHistoryContainer}>
              <Icon name="bank-transfer-out" size={48} color={colors.textDisabled} />
              <Text style={styles.emptyHistoryText}>No transfer history</Text>
            </View>
          ) : (
            transferHistory.map((item) => (
              <View key={item.id}>
                {renderTransferHistoryItem({ item })}
              </View>
            ))
          )}
        </View>
      )}

      {/* Confirmation Modal */}
      <Portal>
        <Modal
          visible={showConfirmModal}
          onDismiss={() => setShowConfirmModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>{t('common.confirm')} Transfer</Text>

          <View style={styles.confirmDetails}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>To</Text>
              <Text style={styles.confirmValue}>
                {selectedContact?.name || upiId}
              </Text>
            </View>
            {(selectedContact?.upiId || upiId) && (
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>UPI ID</Text>
                <Text style={styles.confirmValue}>
                  {selectedContact?.upiId || upiId}
                </Text>
              </View>
            )}
            <Divider style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>{t('payouts.amount')}</Text>
              <Text style={styles.confirmAmount}>
                {amount ? formatCurrency(parseFloat(amount)) : '₹0'}
              </Text>
            </View>
            {description ? (
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('payouts.note')}</Text>
                <Text style={styles.confirmValue}>{description}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowConfirmModal(false)}
              style={styles.modalBtn}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmTransfer}
              style={styles.modalBtn}
            >
              {t('common.confirm')}
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* PIN Modal */}
      <Portal>
        <Modal
          visible={showPinModal}
          onDismiss={() => {
            setShowPinModal(false);
            setPin('');
          }}
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.pinHeader}>
            <Icon name="shield-lock" size={40} color={colors.primary} />
            <Text style={styles.modalTitle}>{t('payouts.enterPin')}</Text>
          </View>
          <Text style={styles.modalSubtitle}>
            {t('payouts.confirmPayment', {
              amount: amount ? formatCurrency(parseFloat(amount)) : '₹0',
              recipient: selectedContact?.name || upiId,
            })}
          </Text>

          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
            mode="outlined"
            style={styles.pinInput}
            placeholder="Enter PIN"
          />

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setShowPinModal(false);
                setPin('');
              }}
              style={styles.modalBtn}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleTransfer}
              loading={isLoading}
              disabled={pin.length < 4 || isLoading}
              style={styles.modalBtn}
            >
              {t('common.confirm')}
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );

  return <SafeAreaView style={styles.container}>{renderTransferForm()}</SafeAreaView>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  recipientCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  selectedContact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  contactInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  contactUpi: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
  },
  recentCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  loader: {
    marginVertical: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  recentContact: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 72,
  },
  recentAvatar: {
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.xs,
  },
  recentName: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  amountCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: 'bold',
    backgroundColor: 'transparent',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickBtn: {
    flex: 1,
  },
  noteInput: {
    backgroundColor: colors.surface,
  },
  payButton: {
    borderRadius: 12,
    marginTop: spacing.md,
  },
  payButtonContent: {
    paddingVertical: spacing.md,
  },
  payButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historySection: {
    marginTop: spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyAvatar: {
    marginRight: spacing.sm,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusChip: {
    height: 22,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  modalContent: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
  },
  pinHeader: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  confirmDetails: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  confirmLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  confirmAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  confirmDivider: {
    marginVertical: spacing.xs,
  },
  pinInput: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
});

export default PayoutScreen;
