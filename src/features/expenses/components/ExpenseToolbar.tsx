import React, { useMemo } from 'react';
import { ExpenseCategory } from '../../../domain/expenses/ExpenseCategory';
import { EXPENSE_PAYMENT_METHODS } from '../../../domain/expenses/ExpensePaymentMethod';
import { Search, FolderKanban } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Select, SelectOption } from '../../../components/ui/Select';
import { FilterToolbar } from '../../../components/ui/FilterToolbar';

interface ExpenseToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  selectedPaymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  categories: ExpenseCategory[];
  onOpenCategoriesModal: () => void;
}

export const ExpenseToolbar: React.FC<ExpenseToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategoryId,
  onCategoryChange,
  selectedPaymentMethod,
  onPaymentMethodChange,
  categories,
  onOpenCategoriesModal,
}) => {
  const categoryFilterOptions: SelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'Todas las categorías' },
      ...categories.map((c) => ({
        value: c.id,
        label: c.name,
      })),
    ];
  }, [categories]);

  const paymentFilterOptions: SelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'Todos los métodos' },
      ...EXPENSE_PAYMENT_METHODS.map((m) => ({
        value: m.code,
        label: m.label,
      })),
    ];
  }, []);

  return (
    <FilterToolbar className="my-1">
      {/* Left: Search and Filters */}
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por descripción, N° de gasto, documento..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border-default rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-xs"
          />
        </div>

        {/* Category Filter */}
        <Select
          options={categoryFilterOptions}
          value={selectedCategoryId}
          onChange={onCategoryChange}
          placeholder="Todas las categorías"
          className="shrink-0 sm:w-auto"
        />

        {/* Payment Method Filter */}
        <Select
          options={paymentFilterOptions}
          value={selectedPaymentMethod}
          onChange={onPaymentMethodChange}
          placeholder="Todos los métodos"
          className="shrink-0 sm:w-auto"
        />
      </div>

      {/* Right: Manage Categories Button */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="md"
          onClick={onOpenCategoriesModal}
          className="flex items-center gap-2"
        >
          <FolderKanban size={16} />
          <span>Categorías</span>
        </Button>
      </div>
    </FilterToolbar>
  );
};
