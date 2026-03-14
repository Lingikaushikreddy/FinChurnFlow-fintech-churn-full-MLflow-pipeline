/**
 * Employee Model - Mock version for development
 * TODO: Install @nozbe/watermelondb for production offline support
 */

export interface Employee {
  id: string;
  serverId: string | null;
  merchantId: string;
  name: string;
  phone: string | null;
  upiId: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  salary: number;
  payDay: number;
  isActive: boolean;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Helper functions that were getters on the class
export const getDisplaySalary = (salary: number): string => {
  return `₹${salary.toLocaleString('en-IN')}`;
};

export const hasUpi = (employee: Employee): boolean => {
  return !!employee.upiId;
};

export const hasBankAccount = (employee: Employee): boolean => {
  return !!employee.bankAccount && !!employee.ifsc;
};

export const canReceivePayment = (employee: Employee): boolean => {
  return hasUpi(employee) || hasBankAccount(employee);
};

export const getPaymentMethod = (employee: Employee): 'upi' | 'bank' | 'none' => {
  if (hasUpi(employee)) return 'upi';
  if (hasBankAccount(employee)) return 'bank';
  return 'none';
};

export const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getOrdinalSuffix = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

export const getPayDayLabel = (payDay: number): string => {
  const suffix = getOrdinalSuffix(payDay);
  return `${payDay}${suffix}`;
};

export const isPayDayToday = (payDay: number): boolean => {
  return new Date().getDate() === payDay;
};

export const getDaysUntilPayDay = (payDay: number): number => {
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  if (currentDay <= payDay) {
    return payDay - currentDay;
  }
  return daysInMonth - currentDay + payDay;
};

export default Employee;
