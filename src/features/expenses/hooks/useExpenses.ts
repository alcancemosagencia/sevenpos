import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  OperatingExpenseWithDetails,
  ExpenseKpiSummary,
} from '../../../domain/expenses/OperatingExpense';
import { ExpenseCategory } from '../../../domain/expenses/ExpenseCategory';
import { ExpensePaymentMethod } from '../../../domain/expenses/ExpensePaymentMethod';
import { CashSession } from '../../../domain/cash/CashSession';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { calculateExpectedCash } from '../../../domain/cash/CashSessionMath';

export function useExpenses() {
  const businessId = 'primary-business';

  // State
  const [expenses, setExpenses] = useState<OperatingExpenseWithDetails[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [kpis, setKpis] = useState<ExpenseKpiSummary>({
    todayTotal: 0,
    monthTotal: 0,
    cashPaidTotal: 0,
    expensesCount: 0,
  });
  const [totalCount, setTotalCount] = useState(0);

  // Cash Session State
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [liveCashBalance, setLiveCashBalance] = useState(0);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [loading, setLoading] = useState(true);

  // Repositories
  const expenseQueryRepo = useMemo(() => repositoryFactory.getExpenseQueryRepository(), []);
  const categoryRepo = useMemo(() => repositoryFactory.getExpenseCategoryRepository(), []);
  const cashSessionRepo = useMemo(() => repositoryFactory.getCashSessionRepository(), []);
  const cashRegisterRepo = useMemo(() => repositoryFactory.getCashRegisterRepository(), []);

  // Fetch Categories
  const loadCategories = useCallback(async () => {
    try {
      await categoryRepo.ensureDefaults(businessId);
      const list = await categoryRepo.list(businessId, true);
      setCategories(list);
    } catch {
      // Fallback
    }
  }, [categoryRepo, businessId]);

  // Fetch Cash Session & Balance
  const loadCashSession = useCallback(async () => {
    try {
      const registers = await cashRegisterRepo.list(businessId);
      const activeReg = registers.find((r) => r.active) || registers[0];
      if (activeReg) {
        const session = await cashSessionRepo.getActiveSession(businessId, activeReg.id);
        setActiveSession(session);

        if (session && session.status === 'OPEN') {
          const movements = await cashSessionRepo.listMovementsBySession(session.id, businessId);
          const balance = calculateExpectedCash(movements);
          setLiveCashBalance(balance);
        } else {
          setLiveCashBalance(0);
        }
      }
    } catch {
      setActiveSession(null);
      setLiveCashBalance(0);
    }
  }, [cashRegisterRepo, cashSessionRepo, businessId]);

  // Fetch Expenses & KPIs
  const loadExpensesData = useCallback(async () => {
    try {
      setLoading(true);
      const todayDate = new Date().toISOString().split('T')[0];
      const monthPrefix = todayDate.substring(0, 7);

      const [listResult, kpiSummary] = await Promise.all([
        expenseQueryRepo.list(businessId, {
          search: searchQuery,
          categoryId: selectedCategoryId || undefined,
          paymentMethodCode: (selectedPaymentMethod as ExpensePaymentMethod) || undefined,
          limit: 100,
        }),
        expenseQueryRepo.getKpiSummary(businessId, todayDate, monthPrefix),
      ]);

      setExpenses(listResult.expenses);
      setTotalCount(listResult.totalCount);
      setKpis(kpiSummary);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [expenseQueryRepo, businessId, searchQuery, selectedCategoryId, selectedPaymentMethod]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCategories(), loadCashSession(), loadExpensesData()]);
  }, [loadCategories, loadCashSession, loadExpensesData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategories();
    loadCashSession();
  }, [loadCategories, loadCashSession]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadExpensesData();
  }, [loadExpensesData]);

  return {
    expenses,
    categories,
    kpis,
    totalCount,
    activeSession,
    liveCashBalance,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    refreshAll,
    loadCategories,
    loadCashSession,
    loadExpensesData,
  };
}
