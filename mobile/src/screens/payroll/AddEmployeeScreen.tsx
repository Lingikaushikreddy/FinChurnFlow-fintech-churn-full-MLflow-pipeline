/**
 * AddEmployeeScreen - Add or edit employee
 * Features: Name, Phone, UPI ID, Bank Account, IFSC, Salary, Pay Day,
 * Department, Designation, active toggle, create/edit modes
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  HelperText,
  Menu,
  Switch,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { AppDispatch, RootState } from '../../store';
import {
  createEmployee,
  updateEmployee,
  Employee,
} from '../../store/slices/employeesSlice';
import { colors, spacing, shadows } from '../../theme';

type RouteParams = {
  AddEmployee: { employee?: Employee; viewMode?: boolean };
};

const PAY_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

const AddEmployeeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'AddEmployee'>>();
  const dispatch = useDispatch<AppDispatch>();

  const { isLoading } = useSelector((state: RootState) => state.employees);
  const editEmployee = route.params?.employee;

  const [name, setName] = useState(editEmployee?.name || '');
  const [phone, setPhone] = useState(editEmployee?.phone || '');
  const [upiId, setUpiId] = useState(editEmployee?.upiId || '');
  const [bankAccount, setBankAccount] = useState((editEmployee as any)?.bankAccount || '');
  const [ifscCode, setIfscCode] = useState((editEmployee as any)?.ifscCode || '');
  const [salary, setSalary] = useState(editEmployee?.salary?.toString() || '');
  const [payDay, setPayDay] = useState(editEmployee?.payDay || 1);
  const [department, setDepartment] = useState((editEmployee as any)?.department || '');
  const [designation, setDesignation] = useState((editEmployee as any)?.designation || '');
  const [isActive, setIsActive] = useState(editEmployee?.isActive ?? true);

  const [payDayMenuVisible, setPayDayMenuVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t('payroll.errors.nameRequired');
    }

    if (!upiId && !phone && !bankAccount) {
      newErrors.upiId = t('payroll.errors.contactRequired');
    }

    if (upiId && !/^[\w.\-]+@[\w]+$/.test(upiId)) {
      newErrors.upiId = t('payroll.errors.upiInvalid');
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      newErrors.phone = t('payroll.errors.phoneInvalid');
    }

    if (bankAccount && !/^\d{9,18}$/.test(bankAccount)) {
      newErrors.bankAccount = t('payroll.errors.bankAccountInvalid', { defaultValue: 'Enter a valid bank account number (9-18 digits)' });
    }

    if (bankAccount && ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      newErrors.ifscCode = t('payroll.errors.ifscInvalid', { defaultValue: 'Enter a valid IFSC code (e.g., SBIN0001234)' });
    }

    if (bankAccount && !ifscCode) {
      newErrors.ifscCode = t('payroll.errors.ifscRequired', { defaultValue: 'IFSC code is required with bank account' });
    }

    if (!salary || isNaN(parseFloat(salary)) || parseFloat(salary) <= 0) {
      newErrors.salary = t('payroll.errors.salaryInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const employeeData = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      upi_id: upiId.trim() || undefined,
      bank_account: bankAccount.trim() || undefined,
      ifsc_code: ifscCode.trim().toUpperCase() || undefined,
      salary: parseFloat(salary),
      pay_day: payDay,
      department: department.trim() || undefined,
      designation: designation.trim() || undefined,
      is_active: isActive,
    };

    try {
      if (editEmployee) {
        await dispatch(updateEmployee({ id: editEmployee.id, data: employeeData })).unwrap();
      } else {
        await dispatch(createEmployee(employeeData)).unwrap();
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error || t('payroll.errors.saveFailed'));
    }
  };

  const getOrdinalSuffix = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Basic Info */}
        <Text style={styles.sectionTitle}>{t('payroll.basicInfo')}</Text>
        <Surface style={styles.formCard}>
          <TextInput
            label={t('payroll.employeeName') + ' *'}
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            error={!!errors.name}
            left={<TextInput.Icon icon="account" />}
          />
          {errors.name && <HelperText type="error">{errors.name}</HelperText>}

          <TextInput
            label={t('payroll.phone')}
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            maxLength={10}
            error={!!errors.phone}
            left={<TextInput.Icon icon="phone" />}
          />
          {errors.phone && <HelperText type="error">{errors.phone}</HelperText>}

          <TextInput
            label={t('payroll.department', { defaultValue: 'Department' })}
            value={department}
            onChangeText={setDepartment}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="domain" />}
            placeholder="e.g., Sales, Kitchen, Delivery"
          />

          <TextInput
            label={t('payroll.designation', { defaultValue: 'Designation' })}
            value={designation}
            onChangeText={setDesignation}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="badge-account" />}
            placeholder="e.g., Manager, Helper, Driver"
          />
        </Surface>

        {/* Payment Info */}
        <Text style={styles.sectionTitle}>{t('payroll.paymentInfo', { defaultValue: 'Payment Details' })}</Text>
        <Surface style={styles.formCard}>
          <TextInput
            label={t('payroll.upiId')}
            value={upiId}
            onChangeText={setUpiId}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            error={!!errors.upiId}
            left={<TextInput.Icon icon="at" />}
            placeholder="name@upi"
          />
          {errors.upiId && <HelperText type="error">{errors.upiId}</HelperText>}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            label={t('payroll.bankAccount', { defaultValue: 'Bank Account Number' })}
            value={bankAccount}
            onChangeText={setBankAccount}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            error={!!errors.bankAccount}
            left={<TextInput.Icon icon="bank" />}
            placeholder="Enter account number"
          />
          {errors.bankAccount && <HelperText type="error">{errors.bankAccount}</HelperText>}

          <TextInput
            label={t('payroll.ifscCode', { defaultValue: 'IFSC Code' })}
            value={ifscCode}
            onChangeText={(text) => setIfscCode(text.toUpperCase())}
            mode="outlined"
            style={styles.input}
            autoCapitalize="characters"
            maxLength={11}
            error={!!errors.ifscCode}
            left={<TextInput.Icon icon="card-account-details" />}
            placeholder="e.g., SBIN0001234"
          />
          {errors.ifscCode && <HelperText type="error">{errors.ifscCode}</HelperText>}

          <Text style={styles.helperText}>
            {t('payroll.paymentHint', { defaultValue: 'Provide either UPI ID or Bank Account for salary transfer' })}
          </Text>
        </Surface>

        {/* Salary Info */}
        <Text style={styles.sectionTitle}>{t('payroll.salaryInfo')}</Text>
        <Surface style={styles.formCard}>
          <TextInput
            label={t('payroll.monthlySalary') + ' *'}
            value={salary}
            onChangeText={setSalary}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            error={!!errors.salary}
            left={<TextInput.Affix text="₹" />}
          />
          {errors.salary && <HelperText type="error">{errors.salary}</HelperText>}

          {/* Pay Day Dropdown */}
          <Menu
            visible={payDayMenuVisible}
            onDismiss={() => setPayDayMenuVisible(false)}
            anchor={
              <Surface
                style={styles.dropdown}
                onTouchEnd={() => setPayDayMenuVisible(true)}
              >
                <View style={styles.dropdownInner}>
                  <View style={styles.dropdownLeft}>
                    <Icon name="calendar" size={20} color={colors.textSecondary} />
                    <Text style={styles.dropdownLabel}>{t('payroll.payDay')}</Text>
                  </View>
                  <View style={styles.dropdownRight}>
                    <Text style={styles.dropdownValue}>
                      {getOrdinalSuffix(payDay)} {t('payroll.ofMonth')}
                    </Text>
                    <Icon name="chevron-down" size={20} color={colors.textSecondary} />
                  </View>
                </View>
              </Surface>
            }
          >
            <ScrollView style={styles.menuScroll}>
              {PAY_DAYS.map((day) => (
                <Menu.Item
                  key={day}
                  onPress={() => {
                    setPayDay(day);
                    setPayDayMenuVisible(false);
                  }}
                  title={getOrdinalSuffix(day)}
                  leadingIcon={payDay === day ? 'check' : undefined}
                />
              ))}
            </ScrollView>
          </Menu>

          <Text style={styles.helperText}>
            {t('payroll.payDayHint')}
          </Text>
        </Surface>

        {/* Status */}
        {editEmployee && (
          <>
            <Text style={styles.sectionTitle}>{t('payroll.status')}</Text>
            <Surface style={styles.formCard}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>{t('payroll.employeeActive')}</Text>
                  <Text style={styles.switchHint}>
                    {isActive
                      ? t('payroll.activeHint')
                      : t('payroll.inactiveHint')}
                  </Text>
                </View>
                <Switch value={isActive} onValueChange={setIsActive} />
              </View>
            </Surface>
          </>
        )}

        {/* Summary Card */}
        <Surface style={styles.summaryCard}>
          <Icon name="information-outline" size={20} color={colors.info} />
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>{t('payroll.paymentSummary')}</Text>
            <Text style={styles.summaryText}>
              {t('payroll.paymentSummaryText', {
                name: name || t('payroll.employee'),
                amount: salary ? `₹${parseFloat(salary).toLocaleString('en-IN')}` : '₹0',
                day: getOrdinalSuffix(payDay),
              })}
            </Text>
            {department && (
              <Text style={styles.summaryDetail}>
                {t('payroll.departmentLabel', { defaultValue: 'Department' })}: {department}
                {designation ? ` | ${designation}` : ''}
              </Text>
            )}
            {bankAccount && (
              <Text style={styles.summaryDetail}>
                {t('payroll.bankLabel', { defaultValue: 'Bank A/C' })}: ****{bankAccount.slice(-4)}
                {ifscCode ? ` (${ifscCode})` : ''}
              </Text>
            )}
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
          {editEmployee ? t('payroll.updateEmployee') : t('payroll.addEmployee')}
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
  formCard: {
    padding: spacing.md,
    borderRadius: 12,
    ...shadows.sm,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.textDisabled,
    marginHorizontal: spacing.md,
    fontWeight: '600',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  dropdownInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  dropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownValue: {
    fontSize: 16,
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  menuScroll: {
    maxHeight: 300,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    maxWidth: 250,
  },
  summaryCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  summaryContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.info,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  summaryDetail: {
    fontSize: 12,
    color: colors.textDisabled,
    marginTop: 4,
    lineHeight: 16,
  },
  submitBtn: {
    marginTop: spacing.xl,
  },
  submitBtnContent: {
    paddingVertical: spacing.sm,
  },
});

export default AddEmployeeScreen;
