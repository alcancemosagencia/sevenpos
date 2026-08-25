import React, { useState } from 'react';
import { useExpenses } from '../features/expenses/hooks/useExpenses';
import { ExpenseKpiCards } from '../features/expenses/components/ExpenseKpiCards';
import { ExpenseToolbar } from '../features/expenses/components/ExpenseToolbar';
import { ExpenseTable } from '../features/expenses/components/ExpenseTable';
import { ExpenseMobileCards } from '../features/expenses/components/ExpenseMobileCards';
import { NewExpenseModal } from '../features/expenses/components/NewExpenseModal';
import { ExpenseCategoriesModal } from '../features/expenses/components/ExpenseCategoriesModal';
import { ExpenseDetailModal } from '../features/expenses/components/ExpenseDetailModal';
import { OpenCashModal } from '../features/cash/components/OpenCashModal';
import { OperatingExpenseWithDetails } from '../domain/expenses/OperatingExpense';
import { OpenCashSession } from '../application/cash/OpenCashSession';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import { CurrencyCode } from '../types/country';
import { Button } from '../components/ui/Button';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Plus, Receipt } from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const { activeOwnerName } = useAuth();
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;
  const businessId = 'primary-business';
  const userId = 'primary-user';
  const userName = activeOwnerName || 'Cajero';

  const {
    expenses,
    categories,
    kpis,
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
  } = useExpenses();

  // Modals state
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] =
    useState<OperatingExpenseWithDetails | null>(null);

  const activeCategories = categories.filter((c) => c.active);

  const handleOpenCash = async (openingAmount: number, note: string | null) => {
    const sessionRepo = repositoryFactory.getCashSessionRepository();
    const registerRepo = repositoryFactory.getCashRegisterRepository();
    const openUseCase = new OpenCashSession(sessionRepo, registerRepo);

    await openUseCase.execute({
      businessId,
      openedByUserId: userId,
      openedByNameSnapshot: userName,
      openingAmount,
      currencyCode: currency,
      note,
    });

    await refreshAll();
    setIsOpenCashModalOpen(false);
    setIsNewExpenseOpen(true);
  };

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="Gastos operativos"
        subtitle="Registra y controla los gastos cotidianos de tu negocio."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsNewExpenseOpen(true)}
            leftIcon={<Plus size={16} />}
          >
            <span>Registrar gasto</span>
          </Button>
        }
      />

      {/* KPI Cards */}
      <ExpenseKpiCards kpis={kpis} />

      {/* Toolbar (Search, Filter by Category, Payment Method, Manage Categories) */}
      <ExpenseToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodChange={setSelectedPaymentMethod}
        categories={activeCategories}
        onOpenCategoriesModal={() => setIsCategoriesOpen(true)}
      />

      {/* Content Area */}
      {loading ? (
        <div className="w-full h-64 border border-border-default rounded-2xl bg-surface flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-text-tertiary font-medium">Cargando gastos...</p>
          </div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="w-full py-16 px-4 border border-border-default rounded-2xl bg-surface flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-secondary flex items-center justify-center text-text-tertiary mb-3">
            <Receipt size={28} />
          </div>
          <h3 className="text-base font-bold text-text-primary">
            Aún no tienes gastos registrados
          </h3>
          <p className="text-xs text-text-tertiary max-w-sm mt-1 mb-5">
            Registra los gastos y costos operativos del día a día (luz, arriendo, insumos, etc.) para mantener tus cuentas al día.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsNewExpenseOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Registrar primer gasto</span>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <ExpenseTable
              expenses={expenses}
              onSelectExpense={(exp) => setSelectedExpenseForDetail(exp)}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            <ExpenseMobileCards
              expenses={expenses}
              onSelectExpense={(exp) => setSelectedExpenseForDetail(exp)}
            />
          </div>
        </>
      )}

      {/* Modals */}
      <NewExpenseModal
        isOpen={isNewExpenseOpen}
        onClose={() => setIsNewExpenseOpen(false)}
        onSuccess={() => {
          refreshAll();
        }}
        categories={activeCategories}
        activeSession={activeSession}
        liveCashBalance={liveCashBalance}
        onOpenCashModal={() => {
          setIsNewExpenseOpen(false);
          setIsOpenCashModalOpen(true);
        }}
        onOpenCategoriesModal={() => {
          setIsCategoriesOpen(true);
        }}
      />

      <ExpenseCategoriesModal
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        categories={categories}
        onCategoriesUpdated={() => {
          loadCategories();
          refreshAll();
        }}
      />

      <ExpenseDetailModal
        isOpen={Boolean(selectedExpenseForDetail)}
        onClose={() => setSelectedExpenseForDetail(null)}
        expense={selectedExpenseForDetail}
      />

      <OpenCashModal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        onConfirm={handleOpenCash}
        currency={currency}
        userName={userName}
        registerName="Caja principal"
      />
    </PageContainer>
  );
};
