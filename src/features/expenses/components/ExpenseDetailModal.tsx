import React from 'react';
import { OperatingExpenseWithDetails } from '../../../domain/expenses/OperatingExpense';
import { getExpensePaymentMethodLabel } from '../../../domain/expenses/ExpensePaymentMethod';
import { useCountry } from '../../../context/CountryContext';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { Button } from '../../../components/ui/Button';
import {
  X,
  Calendar,
  Banknote,
  Building2,
  FileText,
  User,
  CheckCircle2,
  Tag,
  Clock,
} from 'lucide-react';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: OperatingExpenseWithDetails | null;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
}) => {
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;

  if (!isOpen || !expense) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const formatTimestamp = (isoStr: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-surface border border-border-default rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-expense-detail-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-secondary/30">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-base text-text-primary">
              {expense.expenseNumber}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 size={12} />
              <span>Confirmado</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Amount Card */}
          <div className="p-4 rounded-2xl bg-surface-secondary/40 border border-border-default text-center">
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
              Monto del Gasto
            </p>
            <h2 className="text-3xl font-extrabold font-mono text-text-primary mt-1">
              {formatMoney(expense.amount, currency)}
            </h2>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
              Descripción
            </label>
            <p className="text-sm font-semibold text-text-primary bg-surface-secondary/20 p-3 rounded-xl border border-border-default/50">
              {expense.description}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Categoría */}
            <div className="p-3 rounded-xl bg-surface-secondary/20 border border-border-default/50 space-y-1">
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <Tag size={14} />
                <span className="font-semibold uppercase">Categoría</span>
              </div>
              <p className="font-bold text-text-primary text-sm">
                {expense.categoryName || expense.categoryNameSnapshot}
              </p>
            </div>

            {/* Método de Pago */}
            <div className="p-3 rounded-xl bg-surface-secondary/20 border border-border-default/50 space-y-1">
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <Banknote size={14} />
                <span className="font-semibold uppercase">Método</span>
              </div>
              <p className="font-bold text-text-primary text-sm">
                {getExpensePaymentMethodLabel(expense.paymentMethodCode)}
              </p>
            </div>

            {/* Fecha Económica */}
            <div className="p-3 rounded-xl bg-surface-secondary/20 border border-border-default/50 space-y-1">
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <Calendar size={14} />
                <span className="font-semibold uppercase">Fecha Gasto</span>
              </div>
              <p className="font-bold text-text-primary text-sm">
                {formatDate(expense.expenseDate)}
              </p>
            </div>

            {/* Registrado por */}
            <div className="p-3 rounded-xl bg-surface-secondary/20 border border-border-default/50 space-y-1">
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <User size={14} />
                <span className="font-semibold uppercase">Registrado por</span>
              </div>
              <p className="font-bold text-text-primary text-sm truncate">
                {expense.createdByNameSnapshot}
              </p>
            </div>
          </div>

          {/* Optional Fields */}
          {expense.supplierNameSnapshot && (
            <div className="p-3 rounded-xl bg-surface-secondary/20 border border-border-default/50 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <Building2 size={14} />
                <span className="font-semibold uppercase">Proveedor</span>
              </div>
              <p className="font-bold text-text-primary text-sm">
                {expense.supplierNameSnapshot}
              </p>
            </div>
          )}

          {expense.referenceDocument && (
            <div className="p-3 rounded-xl bg-surface-secondary/20 border border-border-default/50 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <FileText size={14} />
                <span className="font-semibold uppercase">Documento de Referencia</span>
              </div>
              <p className="font-bold text-text-primary text-sm">
                {expense.referenceDocument}
              </p>
            </div>
          )}

          {expense.cashRegisterName && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                <Banknote size={14} />
                <span>Salida de Caja Física</span>
              </div>
              <p className="text-text-primary font-medium">
                Descontado de <span className="font-bold">{expense.cashRegisterName}</span>
              </p>
            </div>
          )}

          {expense.note && (
            <div className="p-3 rounded-xl bg-surface-secondary/20 border border-border-default/50 space-y-1 text-xs">
              <span className="font-semibold uppercase text-text-tertiary">Notas Internas</span>
              <p className="text-text-secondary italic">{expense.note}</p>
            </div>
          )}

          {/* Audit Timestamp */}
          <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary pt-2 border-t border-border-default/50">
            <Clock size={12} />
            <span>Registrado en el sistema: {formatTimestamp(expense.createdAt)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-default bg-surface-secondary/20 flex justify-end">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
