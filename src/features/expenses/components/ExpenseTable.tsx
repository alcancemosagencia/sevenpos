import React from 'react';
import { OperatingExpenseWithDetails } from '../../../domain/expenses/OperatingExpense';
import { getExpensePaymentMethodLabel } from '../../../domain/expenses/ExpensePaymentMethod';
import { useCountry } from '../../../context/CountryContext';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { Eye, Banknote, Building2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ExpenseTableProps {
  expenses: OperatingExpenseWithDetails[];
  onSelectExpense: (expense: OperatingExpenseWithDetails) => void;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({ expenses, onSelectExpense }) => {
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
    <div className="w-full overflow-hidden border border-border-default rounded-2xl bg-surface shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-default bg-surface-secondary/40 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
              <th className="py-3.5 px-4">N° Gasto</th>
              <th className="py-3.5 px-4">Fecha</th>
              <th className="py-3.5 px-4">Descripción</th>
              <th className="py-3.5 px-4">Categoría</th>
              <th className="py-3.5 px-4">Método de Pago</th>
              <th className="py-3.5 px-4 text-right">Monto</th>
              <th className="py-3.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default/60 text-sm">
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="hover:bg-surface-secondary/30 transition-colors group cursor-pointer"
                onClick={() => onSelectExpense(expense)}
              >
                {/* N° */}
                <td className="py-3 px-4 font-mono font-medium text-text-primary">
                  {expense.expenseNumber}
                </td>

                {/* Fecha */}
                <td className="py-3 px-4 text-text-secondary whitespace-nowrap">
                  {formatDate(expense.expenseDate)}
                </td>

                {/* Descripción + Proveedor */}
                <td className="py-3 px-4 max-w-[280px]">
                  <div className="font-semibold text-text-primary truncate">
                    {expense.description}
                  </div>
                  {expense.supplierNameSnapshot && (
                    <div className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5 truncate">
                      <Building2 size={12} className="shrink-0" />
                      <span>{expense.supplierNameSnapshot}</span>
                    </div>
                  )}
                </td>

                {/* Categoría */}
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-secondary border border-border-default text-text-secondary">
                    {expense.categoryName || expense.categoryNameSnapshot}
                  </span>
                </td>

                {/* Método */}
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMethodBadgeStyle(
                      expense.paymentMethodCode
                    )}`}
                  >
                    {expense.paymentMethodCode === 'CASH' && <Banknote size={12} />}
                    {getExpensePaymentMethodLabel(expense.paymentMethodCode)}
                  </span>
                </td>

                {/* Monto */}
                <td className="py-3 px-4 text-right font-bold font-mono text-text-primary whitespace-nowrap">
                  {formatMoney(expense.amount, currency)}
                </td>

                {/* Acciones */}
                <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectExpense(expense)}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-brand-primary"
                  >
                    <Eye size={14} />
                    <span>Detalle</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
