/**
 * EmployeeListScreen - Employee management for payroll
 * Features: search, department filter chips, active/inactive filter,
 * employee cards with department/salary, swipe actions, selection mode
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import {
  Text,
  Surface,
  Searchbar,
  FAB,
  Avatar,
  IconButton,
  ActivityIndicator,
  Menu,
  Divider,
  Checkbox,
  Button,
  Chip,
  SegmentedButtons,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { AppDispatch, RootState } from '../../store';
import {
  fetchEmployees,
  deleteEmployee,
  setSearchQuery,
  toggleEmployeeSelection,
  selectAllEmployees,
  clearSelection,
  Employee,
} from '../../store/slices/employeesSlice';
import { colors, spacing, shadows } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

type StatusFilter = 'all' | 'active' | 'inactive';

const EmployeeListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();

  const {
    items,
    isLoading,
    searchQuery,
    total,
    page,
    selectedEmployees,
  } = useSelector((state: RootState) => state.employees);

  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);

  const loadEmployees = useCallback(
    (refresh = false) => {
      const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active';
      dispatch(fetchEmployees({ page: refresh ? 1 : page, search: searchQuery, isActive }));
    },
    [dispatch, page, searchQuery, statusFilter]
  );

  useEffect(() => {
    loadEmployees(true);
  }, [searchQuery, statusFilter]);

  const handleSearch = (query: string) => {
    dispatch(setSearchQuery(query));
  };

  const handleDelete = (employee: Employee) => {
    Alert.alert(
      t('payroll.deleteEmployee'),
      t('payroll.deleteConfirm', { name: employee.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => dispatch(deleteEmployee(employee.id)),
        },
      ]
    );
  };

  const handleEdit = (employee: Employee) => {
    setMenuVisible(null);
    setSwipedItemId(null);
    navigation.navigate('AddEmployee', { employee });
  };

  const handleSelectAll = () => {
    const activeItems = filteredItems.filter(e => e.isActive);
    if (selectedEmployees.length === activeItems.length) {
      dispatch(clearSelection());
    } else {
      dispatch(selectAllEmployees());
    }
  };

  const handlePaySalary = () => {
    if (selectedEmployees.length === 0) {
      Alert.alert(t('common.error'), t('payroll.selectEmployees'));
      return;
    }
    navigation.navigate('SalaryProcess', { employeeIds: selectedEmployees });
    setSelectionMode(false);
    dispatch(clearSelection());
  };

  const toggleSelection = (id: string) => {
    dispatch(toggleEmployeeSelection(id));
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    dispatch(clearSelection());
  };

  const handleViewDetails = (employee: Employee) => {
    if (selectionMode) {
      if (employee.isActive) {
        toggleSelection(employee.id);
      }
      return;
    }
    navigation.navigate('AddEmployee', { employee, viewMode: true });
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Extract unique departments from employees
  const departments = Array.from(
    new Set(items.map((e) => e.department).filter(Boolean))
  ) as string[];

  // Filter employees by department
  const filteredItems = selectedDepartment
    ? items.filter((e) => e.department === selectedDepartment)
    : items;

  const activeCount = filteredItems.filter(e => e.isActive).length;
  const inactiveCount = filteredItems.filter(e => !e.isActive).length;

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
  };

  const renderDepartmentChips = () => {
    if (departments.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScrollView}
        contentContainerStyle={styles.chipContainer}
      >
        <Chip
          selected={selectedDepartment === null}
          onPress={() => setSelectedDepartment(null)}
          style={styles.departmentChip}
          textStyle={styles.chipText}
        >
          {t('common.all')}
        </Chip>
        {departments.map((dept) => (
          <Chip
            key={dept}
            selected={selectedDepartment === dept}
            onPress={() => setSelectedDepartment(dept)}
            style={styles.departmentChip}
            textStyle={styles.chipText}
          >
            {dept}
          </Chip>
        ))}
      </ScrollView>
    );
  };

  const renderSwipeActions = (employee: Employee) => {
    if (swipedItemId !== employee.id) return null;

    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeEdit]}
          onPress={() => handleEdit(employee)}
        >
          <Icon name="pencil" size={20} color={colors.textInverse} />
          <Text style={styles.swipeActionText}>{t('common.edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeDelete]}
          onPress={() => {
            setSwipedItemId(null);
            handleDelete(employee);
          }}
        >
          <Icon name="delete" size={20} color={colors.textInverse} />
          <Text style={styles.swipeActionText}>{t('common.delete')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmployee = ({ item }: { item: Employee }) => {
    const isSelected = selectedEmployees.includes(item.id);
    const isSwiped = swipedItemId === item.id;

    return (
      <View>
        {renderSwipeActions(item)}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleViewDetails(item)}
          onLongPress={() => {
            if (!selectionMode) {
              setSwipedItemId(isSwiped ? null : item.id);
            }
          }}
        >
          <Surface
            style={[
              styles.employeeCard,
              isSelected && styles.selectedCard,
              !item.isActive && styles.inactiveCard,
            ]}
          >
            {/* Selection Checkbox */}
            {selectionMode && item.isActive && (
              <Checkbox
                status={isSelected ? 'checked' : 'unchecked'}
                onPress={() => toggleSelection(item.id)}
              />
            )}

            {/* Avatar */}
            <Avatar.Text
              size={48}
              label={getInitials(item.name)}
              style={[styles.avatar, !item.isActive && styles.inactiveAvatar]}
            />

            {/* Employee Info */}
            <View style={styles.employeeInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.employeeName}>{item.name}</Text>
                {!item.isActive && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveText}>{t('payroll.inactive')}</Text>
                  </View>
                )}
              </View>

              {item.phone && (
                <View style={styles.detailRow}>
                  <Icon name="phone" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{item.phone}</Text>
                </View>
              )}

              {(item as any).department && (
                <View style={styles.detailRow}>
                  <Icon name="domain" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{(item as any).department}</Text>
                  {(item as any).designation && (
                    <Text style={styles.designationText}> - {(item as any).designation}</Text>
                  )}
                </View>
              )}

              <View style={styles.salaryRow}>
                <Text style={styles.salaryLabel}>{t('payroll.salary')}:</Text>
                <Text style={styles.salaryAmount}>{formatCurrency(item.salary)}</Text>
                <Text style={styles.payDay}>
                  ({t('payroll.payDay', { day: item.payDay })})
                </Text>
              </View>
            </View>

            {/* Menu */}
            {!selectionMode && !isSwiped && (
              <Menu
                visible={menuVisible === item.id}
                onDismiss={() => setMenuVisible(null)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={20}
                    onPress={() => setMenuVisible(item.id)}
                  />
                }
              >
                <Menu.Item
                  leadingIcon="pencil"
                  onPress={() => handleEdit(item)}
                  title={t('common.edit')}
                />
                <Menu.Item
                  leadingIcon="cash-plus"
                  onPress={() => {
                    setMenuVisible(null);
                    navigation.navigate('SalaryProcess', {
                      employeeIds: [item.id],
                      isAdvance: true,
                    });
                  }}
                  title={t('payroll.giveAdvance')}
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
            )}
          </Surface>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="account-group" size={64} color={colors.textDisabled} />
      <Text style={styles.emptyTitle}>{t('payroll.noEmployees')}</Text>
      <Text style={styles.emptyText}>{t('payroll.addEmployeeHint')}</Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoading || items.length === 0) return null;
    return <ActivityIndicator style={styles.footer} />;
  };

  const renderSelectionHeader = () => {
    if (!selectionMode) return null;

    return (
      <View style={styles.selectionHeader}>
        <View style={styles.selectionInfo}>
          <IconButton icon="close" size={24} onPress={exitSelectionMode} iconColor={colors.textInverse} />
          <Text style={styles.selectionCount}>
            {t('payroll.selected', { count: selectedEmployees.length })}
          </Text>
        </View>
        <View style={styles.selectionActions}>
          <Button mode="text" onPress={handleSelectAll} textColor={colors.textInverse}>
            {selectedEmployees.length === filteredItems.filter(e => e.isActive).length
              ? t('payroll.deselectAll')
              : t('payroll.selectAll')}
          </Button>
          <Button
            mode="contained"
            onPress={handlePaySalary}
            disabled={selectedEmployees.length === 0}
            buttonColor={colors.secondary}
          >
            {t('payroll.paySalary')}
          </Button>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Selection Header */}
      {renderSelectionHeader()}

      {/* Search Bar */}
      {!selectionMode && (
        <Searchbar
          placeholder={t('payroll.searchEmployees')}
          value={searchQuery}
          onChangeText={handleSearch}
          style={styles.searchBar}
        />
      )}

      {/* Active/Inactive Filter */}
      {!selectionMode && (
        <SegmentedButtons
          value={statusFilter}
          onValueChange={handleStatusFilterChange}
          buttons={[
            { value: 'all', label: t('common.all') },
            { value: 'active', label: `${t('payroll.active')} (${activeCount})` },
            { value: 'inactive', label: `${t('payroll.inactive')} (${inactiveCount})` },
          ]}
          style={styles.segmentedButtons}
        />
      )}

      {/* Department Filter Chips */}
      {!selectionMode && renderDepartmentChips()}

      {/* Employee Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filteredItems.length} {t('payroll.employees', { count: filteredItems.length })}
        </Text>
        {total > filteredItems.length && (
          <Text style={styles.totalCountText}>
            ({total} {t('common.total')})
          </Text>
        )}
      </View>

      {/* Employees List */}
      {isLoading && items.length === 0 ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderEmployee}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && items.length > 0}
              onRefresh={() => loadEmployees(true)}
            />
          }
          onEndReached={() => {
            if (items.length < total) {
              dispatch(fetchEmployees({ page: page + 1, search: searchQuery }));
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* FAB Group */}
      {!selectionMode && (
        <View style={styles.fabContainer}>
          <FAB
            icon="cash-multiple"
            style={styles.fabSecondary}
            onPress={enterSelectionMode}
            label={t('payroll.paySalary')}
            small
          />
          <FAB
            icon="plus"
            style={styles.fab}
            onPress={() => navigation.navigate('AddEmployee')}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionCount: {
    fontSize: 16,
    color: colors.textInverse,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBar: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    elevation: 0,
    backgroundColor: colors.surface,
  },
  segmentedButtons: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  chipScrollView: {
    marginBottom: spacing.sm,
  },
  chipContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  departmentChip: {
    marginRight: 0,
  },
  chipText: {
    fontSize: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  countText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  totalCountText: {
    fontSize: 12,
    color: colors.textDisabled,
    marginLeft: spacing.xs,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 150,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  selectedCard: {
    backgroundColor: colors.primaryLight + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  inactiveCard: {
    opacity: 0.7,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  inactiveAvatar: {
    backgroundColor: colors.textDisabled,
  },
  employeeInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inactiveBadge: {
    backgroundColor: colors.textDisabled,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  inactiveText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  designationText: {
    fontSize: 13,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  salaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  salaryAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
  payDay: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  swipeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: spacing.sm,
    zIndex: -1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    paddingVertical: spacing.md,
  },
  swipeEdit: {
    backgroundColor: colors.info,
  },
  swipeDelete: {
    backgroundColor: colors.error,
  },
  swipeActionText: {
    color: colors.textInverse,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
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
  fabContainer: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  fabSecondary: {
    backgroundColor: colors.secondary,
  },
  fab: {
    backgroundColor: colors.primary,
  },
});

export default EmployeeListScreen;
