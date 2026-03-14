/**
 * Contacts Screen - Manage beneficiary contacts
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SectionList,
  RefreshControl,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Surface,
  Searchbar,
  FAB,
  Portal,
  Modal,
  TextInput,
  Button,
  Avatar,
  IconButton,
  ActivityIndicator,
  Menu,
  Divider,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppDispatch, RootState } from '../../store';
import {
  fetchContacts,
  createContact,
  updateContact,
  deleteContact,
  setSearchQuery,
} from '../../store/slices/contactsSlice';
import { colors, spacing, shadows } from '../../theme';

interface ContactFormData {
  name: string;
  upiId: string;
  phone: string;
  bankAccount: string;
}

const emptyForm: ContactFormData = {
  name: '',
  upiId: '',
  phone: '',
  bankAccount: '',
};

const ContactsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({ ...emptyForm });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading, searchQuery, total, page } = useSelector(
    (state: RootState) => state.contacts
  );

  const loadContacts = useCallback(
    (refresh = false) => {
      dispatch(fetchContacts({ page: refresh ? 1 : page, search: searchQuery }));
    },
    [dispatch, page, searchQuery]
  );

  useEffect(() => {
    loadContacts(true);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    dispatch(setSearchQuery(query));
  };

  // Group contacts by first letter for alphabetical sections
  const sections = useMemo(() => {
    if (searchQuery) {
      // When searching, show flat list without sections
      return null;
    }

    const grouped: Record<string, any[]> = {};
    const sortedItems = [...items].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );

    sortedItems.forEach((contact) => {
      const letter = (contact.name || '?').charAt(0).toUpperCase();
      if (!grouped[letter]) {
        grouped[letter] = [];
      }
      grouped[letter].push(contact);
    });

    return Object.keys(grouped)
      .sort()
      .map((letter) => ({
        title: letter,
        data: grouped[letter],
      }));
  }, [items, searchQuery]);

  const updateFormField = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditingContactId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (contact: any) => {
    setEditingContactId(contact.id);
    setFormData({
      name: contact.name || '',
      upiId: contact.upi_id || contact.upiId || '',
      phone: contact.phone || '',
      bankAccount: contact.bankAccount || contact.bank_account || '',
    });
    setMenuVisibleId(null);
    setShowAddModal(true);
  };

  const handleSubmitContact = async () => {
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), 'Please enter a name');
      return;
    }

    if (!formData.upiId && !formData.phone) {
      Alert.alert(t('common.error'), 'Please enter UPI ID or phone number');
      return;
    }

    if (formData.upiId && !/^[\w.\-]+@[\w]+$/.test(formData.upiId)) {
      Alert.alert(t('common.error'), 'Please enter a valid UPI ID');
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      Alert.alert(t('common.error'), 'Please enter a valid 10-digit phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        upi_id: formData.upiId.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        bank_account: formData.bankAccount.trim() || undefined,
      };

      if (editingContactId) {
        await dispatch(
          updateContact({ id: editingContactId, data: payload })
        ).unwrap();
      } else {
        await dispatch(createContact(payload)).unwrap();
      }

      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      Alert.alert(t('common.error'), error || 'Failed to save contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (contact: any) => {
    setMenuVisibleId(null);
    Alert.alert(
      t('contacts.deleteConfirm', { name: '' }).replace('?', ''),
      t('contacts.deleteConfirm', { name: contact.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => dispatch(deleteContact(contact.id)),
        },
      ]
    );
  };

  const renderContact = ({ item }: { item: any }) => (
    <Surface style={styles.contactCard}>
      <Avatar.Text
        size={48}
        label={item.name.charAt(0).toUpperCase()}
        style={styles.avatar}
      />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        {(item.upi_id || item.upiId) && (
          <View style={styles.detailRow}>
            <Icon name="at" size={14} color={colors.textSecondary} />
            <Text style={styles.contactDetail}>{item.upi_id || item.upiId}</Text>
          </View>
        )}
        {item.phone && (
          <View style={styles.detailRow}>
            <Icon name="phone" size={14} color={colors.textSecondary} />
            <Text style={styles.contactDetail}>{item.phone}</Text>
          </View>
        )}
        {(item.bankAccount || item.bank_account) && (
          <View style={styles.detailRow}>
            <Icon name="bank" size={14} color={colors.textSecondary} />
            <Text style={styles.contactDetail}>
              {item.bankAccount || item.bank_account}
            </Text>
          </View>
        )}
      </View>
      <Menu
        visible={menuVisibleId === item.id}
        onDismiss={() => setMenuVisibleId(null)}
        anchor={
          <IconButton
            icon="dots-vertical"
            size={20}
            onPress={() => setMenuVisibleId(item.id)}
          />
        }
      >
        <Menu.Item
          leadingIcon="pencil"
          onPress={() => openEditModal(item)}
          title={t('common.edit')}
        />
        <Divider />
        <Menu.Item
          leadingIcon="delete-outline"
          onPress={() => handleDelete(item)}
          title={t('common.delete')}
          titleStyle={{ color: colors.error }}
        />
      </Menu>
    </Surface>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="account-multiple-outline" size={64} color={colors.textDisabled} />
      <Text style={styles.emptyTitle}>{t('contacts.noContacts')}</Text>
      <Text style={styles.emptyText}>
        {t('contacts.addContactHint')}
      </Text>
      <Button
        mode="contained"
        icon="plus"
        onPress={openAddModal}
        style={styles.emptyButton}
      >
        {t('contacts.addContact')}
      </Button>
    </View>
  );

  const renderFooter = () => {
    if (!isLoading || items.length === 0) return null;
    return <ActivityIndicator style={styles.footer} />;
  };

  const renderList = () => {
    if (isLoading && items.length === 0) {
      return <ActivityIndicator style={styles.loader} size="large" />;
    }

    if (sections && !searchQuery) {
      return (
        <SectionList
          sections={sections}
          renderItem={renderContact}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl
              refreshing={isLoading && items.length > 0}
              onRefresh={() => loadContacts(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
        />
      );
    }

    return (
      <FlatList
        data={items}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && items.length > 0}
            onRefresh={() => loadContacts(true)}
            colors={[colors.primary]}
          />
        }
        onEndReached={() => {
          if (items.length < total) {
            dispatch(fetchContacts({ page: page + 1, search: searchQuery }));
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <Searchbar
        placeholder={`${t('common.search')} ${t('contacts.title').toLowerCase()}...`}
        value={searchQuery}
        onChangeText={handleSearch}
        style={styles.searchBar}
        icon="magnify"
      />

      {/* Contact Count */}
      <Text style={styles.countText}>
        {total} {t('contacts.title').toLowerCase()}{total !== 1 ? '' : ''}
      </Text>

      {/* Contacts List */}
      {renderList()}

      {/* Add FAB */}
      <FAB
        icon="plus"
        label={t('contacts.addContact')}
        style={styles.fab}
        onPress={openAddModal}
      />

      {/* Add/Edit Contact Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={() => {
            setShowAddModal(false);
            resetForm();
          }}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>
            {editingContactId ? t('common.edit') + ' Contact' : t('contacts.addContact')}
          </Text>

          <TextInput
            label={`${t('contacts.name')} *`}
            value={formData.name}
            onChangeText={(v) => updateFormField('name', v)}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label={t('contacts.upiId')}
            value={formData.upiId}
            onChangeText={(v) => updateFormField('upiId', v)}
            mode="outlined"
            style={styles.input}
            placeholder="name@upi"
            autoCapitalize="none"
            left={<TextInput.Icon icon="at" />}
          />

          <TextInput
            label={t('contacts.phone')}
            value={formData.phone}
            onChangeText={(v) => updateFormField('phone', v)}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="10 digit number"
            maxLength={10}
            left={<TextInput.Icon icon="phone" />}
          />

          <TextInput
            label="Bank Account (Optional)"
            value={formData.bankAccount}
            onChangeText={(v) => updateFormField('bankAccount', v)}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            placeholder="Account number"
            left={<TextInput.Icon icon="bank" />}
          />

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}
              style={styles.modalBtn}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmitContact}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.modalBtn}
            >
              {editingContactId ? t('common.save') : t('contacts.addContact')}
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    margin: spacing.md,
    elevation: 0,
    backgroundColor: colors.surface,
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
    padding: spacing.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    ...shadows.sm,
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
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
  footer: {
    marginVertical: spacing.md,
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
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});

export default ContactsScreen;
