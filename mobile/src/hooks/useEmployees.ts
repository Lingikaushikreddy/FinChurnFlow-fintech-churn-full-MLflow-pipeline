/**
 * useEmployees Hook - Employee management utilities
 */

import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  recordAdvance,
  setSearchQuery,
  toggleEmployeeSelection,
  selectAllEmployees,
  clearSelection,
  clearEmployees,
  Employee,
} from '../store/slices/employeesSlice';
import {
  processSalary,
  fetchPayrollSummary,
  fetchSalaryHistory,
} from '../store/slices/payrollSlice';

interface UseEmployeesOptions {
  autoFetch?: boolean;
  activeOnly?: boolean;
}

export const useEmployees = (options: UseEmployeesOptions = {}) => {
  const { autoFetch = true, activeOnly = false } = options;
  const dispatch = useDispatch<AppDispatch>();

  const {
    items: employees,
    total,
    page,
    isLoading,
    error,
    searchQuery,
    selectedEmployees,
  } = useSelector((state: RootState) => state.employees);

  const { summary, salaryHistory, isProcessing } = useSelector(
    (state: RootState) => state.payroll
  );

  const loadEmployees = useCallback(
    (refresh = false) => {
      return dispatch(
        fetchEmployees({
          page: refresh ? 1 : page,
          search: searchQuery,
          isActive: activeOnly ? true : undefined,
        })
      );
    },
    [dispatch, page, searchQuery, activeOnly]
  );

  const loadSummary = useCallback(() => {
    return dispatch(fetchPayrollSummary());
  }, [dispatch]);

  const loadSalaryHistory = useCallback(
    (employeeId?: string) => {
      return dispatch(fetchSalaryHistory({ employeeId }));
    },
    [dispatch]
  );

  const addEmployee = useCallback(
    (data: {
      name: string;
      phone?: string;
      upi_id?: string;
      salary: number;
      pay_day?: number;
    }) => {
      return dispatch(createEmployee(data));
    },
    [dispatch]
  );

  const editEmployee = useCallback(
    (id: string, data: Partial<Employee>) => {
      return dispatch(updateEmployee({ id, data }));
    },
    [dispatch]
  );

  const removeEmployee = useCallback(
    (id: string) => {
      return dispatch(deleteEmployee(id));
    },
    [dispatch]
  );

  const giveAdvance = useCallback(
    (data: { employee_id: string; amount: number; description?: string }) => {
      return dispatch(recordAdvance(data));
    },
    [dispatch]
  );

  const paySalaries = useCallback(
    (employeeIds: string[], pin: string, month?: number, year?: number) => {
      return dispatch(
        processSalary({
          employee_ids: employeeIds,
          pin,
          month,
          year,
        })
      );
    },
    [dispatch]
  );

  const search = useCallback(
    (query: string) => {
      dispatch(setSearchQuery(query));
    },
    [dispatch]
  );

  const toggleSelection = useCallback(
    (id: string) => {
      dispatch(toggleEmployeeSelection(id));
    },
    [dispatch]
  );

  const selectAll = useCallback(() => {
    dispatch(selectAllEmployees());
  }, [dispatch]);

  const clearAllSelections = useCallback(() => {
    dispatch(clearSelection());
  }, [dispatch]);

  const loadMore = useCallback(() => {
    if (employees.length < total && !isLoading) {
      dispatch(
        fetchEmployees({
          page: page + 1,
          search: searchQuery,
          isActive: activeOnly ? true : undefined,
        })
      );
    }
  }, [dispatch, employees.length, total, isLoading, page, searchQuery, activeOnly]);

  const refresh = useCallback(() => {
    dispatch(clearEmployees());
    return loadEmployees(true);
  }, [dispatch, loadEmployees]);

  // Calculate totals
  const totalMonthlySalary = employees
    .filter((e) => e.isActive)
    .reduce((sum, e) => sum + e.salary, 0);

  const selectedTotalSalary = employees
    .filter((e) => selectedEmployees.includes(e.id))
    .reduce((sum, e) => sum + e.salary, 0);

  useEffect(() => {
    if (autoFetch) {
      loadEmployees(true);
      loadSummary();
    }
  }, [autoFetch]);

  return {
    // State
    employees,
    total,
    page,
    isLoading,
    isProcessing,
    error,
    searchQuery,
    selectedEmployees,
    summary,
    salaryHistory,
    hasMore: employees.length < total,

    // Computed
    activeEmployees: employees.filter((e) => e.isActive),
    totalMonthlySalary,
    selectedTotalSalary,
    selectedCount: selectedEmployees.length,

    // Actions
    loadEmployees,
    loadSummary,
    loadSalaryHistory,
    addEmployee,
    editEmployee,
    removeEmployee,
    giveAdvance,
    paySalaries,
    search,
    toggleSelection,
    selectAll,
    clearAllSelections,
    loadMore,
    refresh,
  };
};

export default useEmployees;
