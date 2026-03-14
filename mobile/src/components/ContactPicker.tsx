/**
 * Contact Picker Component - Select a contact for payouts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Searchbar, Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, shadows } from '../theme';

export interface Contact {
  id: string;
  name: string;
  upi_id?: string;
  phone?: string;
}

interface ContactPickerProps {
  contacts: Contact[];
  selectedContact?: Contact | null;
  onSelect: (contact: Contact) => void;
  onAddNew?: () => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

const ContactPicker: React.FC<ContactPickerProps> = ({
  contacts,
  selectedContact,
  onSelect,
  onAddNew,
  placeholder = 'Select a contact',
  label,
  error,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>(contacts);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(
        (contact) =>
          contact.name.toLowerCase().includes(query) ||
          contact.upi_id?.toLowerCase().includes(query) ||
          contact.phone?.includes(query)
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const handleSelect = (contact: Contact) => {
    onSelect(contact);
    setShowModal(false);
    setSearchQuery('');
  };

  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={[
        styles.contactItem,
        selectedContact?.id === item.id && styles.contactItemSelected,
      ]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <Avatar.Text
        size={44}
        label={getInitial(item.name)}
        style={styles.avatar}
      />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        {item.upi_id && (
          <Text style={styles.contactDetail}>{item.upi_id}</Text>
        )}
        {item.phone && !item.upi_id && (
          <Text style={styles.contactDetail}>{item.phone}</Text>
        )}
      </View>
      {selectedContact?.id === item.id && (
        <Icon name="check-circle" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="account-search" size={48} color={colors.textDisabled} />
      <Text style={styles.emptyText}>
        {searchQuery ? 'No contacts found' : 'No contacts yet'}
      </Text>
      {onAddNew && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setShowModal(false);
            onAddNew();
          }}
        >
          <Icon name="plus" size={18} color={colors.primary} />
          <Text style={styles.addButtonText}>Add New Contact</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Selected Contact Display / Picker Trigger */}
      <TouchableOpacity
        style={[
          styles.pickerButton,
          error && styles.pickerButtonError,
          selectedContact && styles.pickerButtonSelected,
        ]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        {selectedContact ? (
          <View style={styles.selectedContainer}>
            <Avatar.Text
              size={36}
              label={getInitial(selectedContact.name)}
              style={styles.selectedAvatar}
            />
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName}>{selectedContact.name}</Text>
              <Text style={styles.selectedDetail}>
                {selectedContact.upi_id || selectedContact.phone}
              </Text>
            </View>
            <Icon name="chevron-down" size={24} color={colors.textSecondary} />
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Icon name="account-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.placeholder}>{placeholder}</Text>
            <Icon name="chevron-down" size={24} color={colors.textSecondary} />
          </View>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Contact Selection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <Searchbar
            placeholder="Search contacts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchBar}
          />

          {/* Contact List */}
          <FlatList
            data={filteredContacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />

          {/* Add New Button (when contacts exist) */}
          {onAddNew && contacts.length > 0 && (
            <TouchableOpacity
              style={styles.floatingAddButton}
              onPress={() => {
                setShowModal(false);
                onAddNew();
              }}
            >
              <Icon name="plus" size={24} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  pickerButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  pickerButtonError: {
    borderColor: colors.error,
  },
  pickerButtonSelected: {
    borderColor: colors.primary,
  },
  placeholderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  placeholder: {
    flex: 1,
    fontSize: 16,
    color: colors.textDisabled,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  selectedAvatar: {
    backgroundColor: colors.primary,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  selectedDetail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  searchBar: {
    margin: spacing.md,
    elevation: 0,
    backgroundColor: colors.surfaceVariant,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  contactItemSelected: {
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  contactInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  contactDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  floatingAddButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
});

export default ContactPicker;
