/**
 * SalaryProcessScreen - Process salary payments
 * Features: payroll summary, employee selection with select all toggle,
 * advance deductions, PIN verification, processing status per employee,
 * monthly salary history section
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import {
  Text,
  Surface,
  Button,
  TextInput,
  Checkbox,
  ActivityIndicator,
  Divider,
  Portal,
  Modal,
  Switch,
  Chip,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { AppDispatch, RootState } from '../../store';
import { fetchEmployees, Employee } from '../../store/slices/employeesSlice';
import {
  processSalary,
  fetchSalaryHistory,
  fetchPayrollSummary,
  clearError,
  SalaryPayment,
} from '../../store/slices/payrollSlice';
import { colors, spacing, shadows } from '../../theme';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

type RouteParams = {
  SalaryProcess: { employeeIds?: string[]; isAdvance?: boolean };
};

type ProcessingStatus = Record<string, 'pending' | 'processing' | 'completed' | 'failed'>;

const SalaryProcessScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'SalaryProcess'>>();
  const dispatch = useDispatch<AppDispatch>();

  const { items: allEmployees } = useSelector((state: RootState) => state.employees);
  const { isProcessing, error, salaryHistory, summary } = useSelector(
    (state: RootState) => state.payroll
  );

  const preSelectedIds = route.params?.employeeIds || [];
  const isAdvance = route.params?.isAdvance || false;

  const [selectedIds, setSelectedIds] = useState<string[]>(preSelectedIds);
  const [pin, setPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNote, setAdvanceNote] = useState('');
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({});
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    dispatch(fetchEmployees({ page: 1, isActive: true }));
    dispatch(fetchPayrollSummary());
    dispatch(fetchSalaryHistory({ page: 1 }));
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert(t('common.error'), error);
      dispatch(clearError());
    }
  }, [error]);

  const activeEmployees = allEmployees.filter((e) => e.isActive);

  const selectedEmployees = allEmployees.filter(
    (e) => selectedIds.includes(e.id) && e.isActive
  );

  const totalAmount = isAdvance
    ? (parseFloat(advanceAmount) || 0) * selectedIds.length
    : selectedEmployees.reduce((sum, e) => sum + e.salary, 0);

  const toggleEmployee = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === activeEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeEmployees.map((e) => e.id));
    }
  };

  const handleProceed = () => {
    if (selectedIds.length === 0) {
      Alert.alert(t('common.error'), t('payroll.selectEmployees'));
      return;
    }

    if (isAdvance && (!advanceAmount || parseFloat(advanceAmount) <= 0)) {
      Alert.alert(t('common.error'), t('payroll.errors.advanceAmountRequired'));
      return;
    }

    setShowPinModal(true);
  };

  const handleProcess = async () => {
    if (pin.length !== 4) {
      Alert.alert(t('common.error'), t('payroll.errors.pinRequired'));
      return;
    }

    setShowPinModal(false);
    setIsProcessingBatch(true);

    // Initialize processing status
    const initialStatus: ProcessingStatus = {};
    selectedIds.forEach((id) => {
      initialStatus[id] = 'processing';
    });
    setProcessingStatus(initialStatus);

    try {
      const result = await dispatch(
        processSalary({
          employee_ids: selectedIds,
          pin,
        })
      ).unwrap();

      // Update processing status based on result
      const finalStatus: ProcessingStatus = {};
      selectedIds.forEach((id) => {
        const processedIds = result.processed_ids || [];
        const failedIds = result.failed_ids || [];
        if (failedIds.includes(id)) {
          finalStatus[id] = 'failed';
        } else {
          finalStatus[id] = 'completed';
        }
      });
      setProcessingStatus(finalStatus);

      const successCount = Object.values(finalStatus).filter(
        (s) => s === 'completed'
      ).length;
      const failCount = Object.values(finalStatus).filter(
        (s) => s === 'failed'
      ).length;

      if (failCount === 0) {
        Alert.alert(
          t('common.success'),
          t('payroll.processSuccess', {
            count: successCount,
            amount: formatCurrency(totalAmount),
          }),
          [
            {
              text: t('common.done'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          t('payroll.partialSuccess', { defaultValue: 'Partial Success' }),
          t('payroll.partialSuccessMsg', {
            defaultValue: `${successCount} succeeded, ${failCount} failed`,
            success: successCount,
            failed: failCount,
          })
        );
      }
    } catch (error: any) {
      // Mark all as failed
      const failedStatus: ProcessingStatus = {};
      selectedIds.forEach((id) => {
        failedStatus[id] = 'failed';
      });
      setProcessingStatus(failedStatus);
      Alert.alert(t('common.error'), error);
    }

    setIsProcessingBatch(false);
    setPin('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return { name: 'check-circle', color: colors.success };
      case 'failed':
        return { name: 'close-circle', color: colors.error };
      case 'processing':
        return { name: 'progress-clock', color: colors.warning };
      default:
        return { name: 'circle-outline', color: colors.textDisabled };
    }
  };

  const renderSummaryCard = () => (
    <Surface style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Icon name="account-group" size={28} color={colors.primary} />
          <Text style={styles.summaryValue}>{summary?.activeEmployees || activeEmployees.length}</Text>
          <Text style={styles.summaryLabel}>{t('payroll.activeEmployees', { defaultValue: 'Active' })}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Icon name="cash-multiple" size={28} color={colors.success} />
          <Text style={styles.summaryValue}>
            {formatCurrency(summary?.totalMonthlyPayroll || totalAmount)}
          </Text>
          <Text style={styles.summaryLabel}>{t('payroll.monthlyPayroll', { defaultValue: 'Monthly' })}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Icon name="cash-minus" size={28} color={colors.warning} />
          <Text style={styles.summaryValue}>
            {formatCurrency(summary?.pendingAdvances || 0)}
          </Text>
          <Text style={styles.summaryLabel}>{t('payroll.advances', { defaultValue: 'Advances' })}</Text>
        </View>
      </View>
    </Surface>
  );

  const renderEmployee = (employee: Employee) => {
    const isSelected = selectedIds.includes(employee.id);
    const status = processingStatus[employee.id];
    const statusInfo = status ? getStatusIcon(status) : null;

    return (
      <Surface
        key={employee.id}
        style={[styles.employeeCard, isSelected && styles.selectedCard]}
        onTouchEnd={() => !isProcessingBatch && toggleEmployee(employee.id)}
      >
        {/* Status or Checkbox */}
        {statusInfo ? (
          <View style={styles.statusIconContainer}>
            {status === 'processing' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name={statusInfo.name} size={24} color={statusInfo.color} />
            )}
          </View>
        ) : (
          <Checkbox
            status={isSelected ? 'checked' : 'unchecked'}
            onPress={() => !isProcessingBatch && toggleEmployee(employee.id)}
            disabled={isProcessingBatch}
          />
        )}

        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeDetail}>
            {employee.upiId || employee.phone}
          </Text>
          {(employee as any).department && (
            <Text style={styles.employeeDepartment}>
              {(employee as any).department}
            </Text>
          )}
        </View>

        <View style={styles.amountColumn}>
          <Text style={styles.employeeSalary}>
            {formatCurrency(isAdvance ? parseFloat(advanceAmount) || 0 : employee.salary)}
          </Text>
          {statusInfo && (
            <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
              {t(`payroll.status.${status}`, { defaultValue: status })}
            </Text>
          )}
        </View>
      </Surface>
    );
  };

  const renderHistoryItem = (payment: SalaryPayment) => {
    const statusColor = payment.status === 'completed'
      ? colors.success
      : payment.status === 'failed'
        ? colors.error
        : colors.warning;

    return (
      <View key={payment.id} style={styles.historyItem}>
        <View style={styles.historyLeft}>
          <Text style={styles.historyName}>{payment.employeeName}</Text>
          <Text style={styles.historyDate}>
            {formatDateTime(payment.createdAt)}
          </Text>
        </View>
        <View style={styles.historyRight}>
          <Text style={styles.historyAmount}>{formatCurrency(payment.amount)}</Text>
          <View
            style={[
              styles.historyStatusBadge,
              { backgroundColor: statusColor + '15' },
            ]}
          >
            <Text style={[styles.historyStatusText, { color: statusColor }]}>
              {payment.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Surface style={styles.headerCard}>
          <Icon
            name={isAdvance ? 'cash-plus' : 'cash-multiple'}
            size={48}
            color={colors.primary}
          />
          <Text style={styles.headerTitle}>
            {isAdvance ? t('payroll.giveAdvance') : t('payroll.processSalary')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isAdvance
              ? t('payroll.advanceHint')
              : t('payroll.salaryHint')}
          </Text>
        </Surface>

        {/* Payroll Summary */}
        {!isAdvance && renderSummaryCard()}

        {/* Advance Amount Input */}
        {isAdvance && (
          <Surface style={styles.advanceCard}>
            <TextInput
              label={t('payroll.advanceAmount')}
              value={advanceAmount}
              onChangeText={setAdvanceAmount}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Affix text="₹" />}
            />
            <TextInput
              label={t('payroll.note')}
              value={advanceNote}
              onChangeText={setAdvanceNote}
              mode="outlined"
              style={styles.input}
              placeholder={t('payroll.notePlaceholder')}
            />
          </Surface>
        )}

        {/* Select All Toggle + Employee Count */}
        <View style={styles.selectionBar}>
          <Text style={styles.sectionTitle}>
            {t('payroll.selectEmployees')} ({selectedIds.length}/{activeEmployees.length})
          </Text>
          <Button
            mode="text"
            compact
            onPress={handleSelectAll}
            disabled={isProcessingBatch}
          >
            {selectedIds.length === activeEmployees.length
              ? t('payroll.deselectAll')
              : t('payroll.selectAll')}
          </Button>
        </View>

        {activeEmployees.length === 0 ? (
          <Surface style={styles.emptyCard}>
            <Icon name="account-off" size={48} color={colors.textDisabled} />
            <Text style={styles.emptyText}>{t('payroll.noActiveEmployees')}</Text>
          </Surface>
        ) : (
          activeEmployees.map((employee) => renderEmployee(employee))
        )}

        {/* Processing Status Indicator */}
        {isProcessingBatch && (
          <Surface style={styles.processingIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.processingText}>
              {t('payroll.processingPayments', { defaultValue: 'Processing payments...' })}
            </Text>
          </Surface>
        )}

        {/* Monthly Salary History */}
        <View style={styles.historyHeader}>
          <Text style={styles.historySectionTitle}>
            {t('payroll.salaryHistory', { defaultValue: 'Salary History' })}
          </Text>
          <Button
            mode="text"
            compact
            onPress={() => setShowHistory(!showHistory)}
          >
            {showHistory
              ? t('common.hide', { defaultValue: 'Hide' })
              : t('common.viewAll', { defaultValue: 'View All' })}
          </Button>
        </View>

        {showHistory && (
          <Surface style={styles.historyCard}>
            {salaryHistory.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Icon name="history" size={32} color={colors.textDisabled} />
                <Text style={styles.historyEmptyText}>
                  {t('payroll.noHistory', { defaultValue: 'No salary history yet' })}
                </Text>
              </View>
            ) : (
              salaryHistory.slice(0, 20).map((payment) => renderHistoryItem(payment))
            )}
          </Surface>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Summary */}
      <Surface style={styles.bottomCard}>
        <View style={styles.bottomSummaryRow}>
          <Text style={styles.bottomSummaryLabel}>{t('payroll.totalAmount')}</Text>
          <Text style={styles.bottomSummaryAmount}>{formatCurrency(totalAmount)}</Text>
        </View>
        <Text style={styles.bottomSummaryHint}>
          {t('payroll.transferTo', { count: selectedIds.length })}
        </Text>

        <Button
          mode="contained"
          onPress={handleProceed}
          style={styles.processBtn}
          contentStyle={styles.processBtnContent}
          loading={isProcessing}
          disabled={isProcessing || isProcessingBatch || selectedIds.length === 0}
        >
          {isAdvance ? t('payroll.sendAdvance') : t('payroll.paySalary')}
        </Button>
      </Surface>

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
          <Icon name="lock" size={48} color={colors.primary} style={styles.modalIcon} />
          <Text style={styles.modalTitle}>{t('payroll.enterPin')}</Text>
          <Text style={styles.modalSubtitle}>
            {t('payroll.pinHint', { amount: formatCurrency(totalAmount) })}
          </Text>

          <TextInput
            value={pin}
            onChangeText={setPin}
            mode="outlined"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            style={styles.pinInput}
            placeholder="••••"
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
              onPress={handleProcess}
              style={styles.modalBtn}
              loading={isProcessing}
              disabled={pin.length !== 4 || isProcessing}
            >
              {t('common.confirm')}
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
  scrollView: {
    flex: 1,
  },
  headerCard: {
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    ...shadows.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  summaryCard: {
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.lg,
    borderRadius: 12,
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
  },
  advanceCard: {
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.md,
    borderRadius: 12,
    ...shadows.sm,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    ...shadows.sm,
  },
  selectedCard: {
    backgroundColor: colors.primaryLight + '15',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  employeeDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  employeeDepartment: {
    fontSize: 12,
    color: colors.textDisabled,
    marginTop: 2,
  },
  amountColumn: {
    alignItems: 'flex-end',
  },
  employeeSalary: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primaryLight + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  processingText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  emptyCard: {
    margin: spacing.md,
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historyCard: {
    marginHorizontal: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.sm,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  historyLeft: {
    flex: 1,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historyStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  historyEmpty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  historyEmptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  bottomSpacer: {
    height: 120,
  },
  bottomCard: {
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadows.lg,
  },
  bottomSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomSummaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  bottomSummaryAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomSummaryHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  processBtn: {
    marginTop: spacing.lg,
  },
  processBtnContent: {
    paddingVertical: spacing.sm,
  },
  modalContent: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  pinInput: {
    width: 150,
    marginTop: spacing.lg,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
  },
});

export default SalaryProcessScreen;
