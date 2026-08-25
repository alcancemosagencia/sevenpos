import React from 'react';
import { OperatingExpenseWithDetails } from '../../../domain/expenses/OperatingExpense';
import { getExpensePaymentMethodLabel } from '../../../domain/expenses/ExpensePaymentMethod';
import { useCountry } from '../../../context/CountryContext';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { Banknote, Building2, Calendar } from 'lucide-react';

interface ExpenseMobileCardsProps {
  expenses: OperatingExpenseWithDetails[];
  onSelectExpense: (expense: OperatingExpenseWithDetails) => void;
}

export const ExpenseMobileCards: React.FC<ExpenseMobileCardsProps> = ({
  expenses,
  onSelectExpense,
}) => {
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const getMethodBadgeStyle = (methodCode: string) => {
    switch (methodCode) {
      case 'CASH':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'TRANSFER':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'DEBIT_CARD':
      case 'CREDIT_CARD':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      default:
        return 'bg-surface-secondary text-text-secondary border-border-default';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {expenses.map((expense) => (
        <div
          key={expense.id}
          onClick={() => onSelectExpense(expense)}
          className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs hover:border-border-hover transition-all active:scale-[0.99] cursor-pointer flex flex-col gap-2.5"
        >
          {/* Header: Expense Number & Amount */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-text-secondary">
              {expense.expenseNumber}
            </span>
            <span className="text-base font-bold font-mono text-text-primary">
              {formatMoney(expense.amount, currency)}
            </span>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-semibold text-text-primary text-sm line-clamp-2">
              {expense.description}
            </h4>
            {expense.supplierNameSnapshot && (
              <div className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5">
                <Building2 size={12} className="shrink-0" />
                <span className="truncate">{expense.supplierNameSnapshot}</span>
              </div>
            )}
          </div>

          {/* Badges & Meta */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-default/50 text-xs">
            <div className="flex items-center gap-1.5 text-text-tertiary">
              <Calendar size={12} />
              <span>{formatDate(expense.expenseDate)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-surface-secondary border border-border-default text-text-secondary text-[11px]">
                {expense.categoryName || expense.categoryNameSnapshot}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium border text-[11px] ${getMethodBadgeStyle(
                  expense.paymentMethodCode
                )}`}
              >
                {expense.paymentMethodCode === 'CASH' && <Banknote size={10} />}
                {getExpensePaymentMethodLabel(expense.paymentMethodCode)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
