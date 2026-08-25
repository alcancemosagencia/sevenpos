import React, { useState, useEffect, useMemo } from 'react';
import { ExpenseCategory } from '../../../domain/expenses/ExpenseCategory';
import { ExpensePaymentMethod, EXPENSE_PAYMENT_METHODS } from '../../../domain/expenses/ExpensePaymentMethod';
import { CashSession } from '../../../domain/cash/CashSession';
import { Supplier } from '../../../domain/purchases/Supplier';
import { RecordOperatingExpense } from '../../../application/expenses/RecordOperatingExpense';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { useAuth } from '../../../context/AuthContext';
import { useCountry } from '../../../context/CountryContext';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { generateUuid } from '../../../domain/common/IdGenerator';
import { Button } from '../../../components/ui/Button';
import { MoneyInput } from '../../../components/ui/MoneyInput';
import { Select, SelectOption } from '../../../components/ui/Select';
import { DatePicker } from '../../../components/ui/DatePicker';
import { X, AlertCircle, Banknote, Plus, AlertTriangle } from 'lucide-react';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: ExpenseCategory[];
  activeSession: CashSession | null;
  liveCashBalance: number;
  onOpenCashModal?: () => void;
  onOpenCategoriesModal?: () => void;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  activeSession,
  liveCashBalance,
  onOpenCashModal,
  onOpenCategoriesModal,
}) => {
  const { activeOwnerName } = useAuth();
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;

  const businessId = 'primary-business';
  const userId = 'primary-user';
  const userName = activeOwnerName || 'Administrador';

  // Form State
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [paymentMethodCode, setPaymentMethodCode] = useState<ExpensePaymentMethod>('CASH');
  const [expenseDate, setExpenseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [supplierId, setSupplierId] = useState('');
  const [referenceDocument, setReferenceDocument] = useState('');
  const [note, setNote] = useState('');

  // Suppliers list for selector
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Feedback State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null);
      setDescription('');
      setAmountMinor(null);
      setPaymentMethodCode('CASH');
      const today = new Date().toISOString().split('T')[0];
      setExpenseDate(today);
      setReferenceDocument('');
      setNote('');
      setSupplierId('');

      if (categories.length > 0 && !categoryId) {
        setCategoryId(categories[0].id);
      }

      // Load active suppliers
      const supplierRepo = repositoryFactory.getSupplierRepository();
      supplierRepo
        .list(businessId, false)
        .then(setSuppliers)
        .catch(() => setSuppliers([]));
    }
  }, [isOpen, categories, categoryId]);

  // Options for Category Select
  const categoryOptions: SelectOption[] = useMemo(() => {
    return categories
      .filter((c) => c.active)
      .map((c) => ({
        value: c.id,
        label: c.name,
      }));
  }, [categories]);

  // Options for Payment Method Select
  const paymentMethodOptions: SelectOption[] = useMemo(() => {
    return EXPENSE_PAYMENT_METHODS.map((m) => ({
      value: m.code,
      label: m.label,
    }));
  }, []);

  // Options for Supplier Select
  const supplierOptions: SelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'Ninguno / Particular' },
      ...suppliers.map((s) => ({
        value: s.id,
        label: s.name,
      })),
    ];
  }, [suppliers]);

  if (!isOpen) return null;

  const isCash = paymentMethodCode === 'CASH';
  const isCashClosed = isCash && (!activeSession || activeSession.status !== 'OPEN');
  const isInsufficientCash = isCash && !isCashClosed && amountMinor !== null && amountMinor > liveCashBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!categoryId) {
      setError('Por favor selecciona una categoría de gasto.');
      return;
    }
    if (!description.trim()) {
      setError('La descripción del gasto es obligatoria.');
      return;
    }
    if (!amountMinor || amountMinor <= 0) {
      setError('Ingresa un monto válido mayor a cero.');
      return;
    }
    if (!expenseDate) {
      setError('La fecha del gasto es obligatoria.');
      return;
    }

    if (isCashClosed) {
      setError('Debes abrir caja para registrar un gasto en efectivo.');
      return;
    }

    if (isInsufficientCash) {
      setError(
        `Fondos insuficientes en la caja. Saldo disponible: ${formatMoney(
          liveCashBalance,
          currency
        )} vs requerido: ${formatMoney(amountMinor, currency)}.`
      );
      return;
    }

    try {
      setSubmitting(true);
      const expenseRepo = repositoryFactory.getOperatingExpenseRepository();
      const categoryRepo = repositoryFactory.getExpenseCategoryRepository();
      const cashSessionRepo = repositoryFactory.getCashSessionRepository();
      const cashRegisterRepo = repositoryFactory.getCashRegisterRepository();
      const supplierRepo = repositoryFactory.getSupplierRepository();

      const useCase = new RecordOperatingExpense(
        expenseRepo,
        categoryRepo,
        cashSessionRepo,
        cashRegisterRepo,
        supplierRepo
      );

      await useCase.execute(businessId, userId, userName, {
        categoryId,
        description: description.trim(),
        amount: amountMinor,
        currencyCode: currency,
        paymentMethodCode,
        expenseDate,
        supplierId: supplierId.trim() ? supplierId : null,
        referenceDocument: referenceDocument.trim() ? referenceDocument.trim() : null,
        note: note.trim() ? note.trim() : null,
        idempotencyKey: generateUuid(),
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar el gasto operativo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-surface border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-expense-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-secondary/30">
          <div>
            <h3 id="modal-expense-title" className="text-lg font-bold text-text-primary">
              Registrar Gasto Operativo
            </h3>
            <p className="text-xs text-text-tertiary">
              Ingresa los detalles del gasto u obligación del negocio
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/20 flex items-start gap-2.5 text-xs text-status-danger font-medium">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Categoría (Full Width) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Categoría <span className="text-status-danger">*</span>
              </label>
              {onOpenCategoriesModal && (
                <button
                  type="button"
                  onClick={onOpenCategoriesModal}
                  className="text-xs text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Nueva categoría</span>
                </button>
              )}
            </div>
            <Select
              options={categoryOptions}
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Seleccionar categoría..."
              className="w-full"
              buttonClassName="w-full py-2.5"
              popoverClassName="w-full"
            />
          </div>

          {/* Row 2: Descripción (Full Width) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Descripción <span className="text-status-danger">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Pago de luz local, compra de bolsas, etc."
              required
              className="w-full px-3.5 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Row 3: Monto | Método de Pago (2-column Desktop Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MoneyInput
              label="Monto"
              required
              valueMinor={amountMinor}
              onChangeMinor={setAmountMinor}
              currency={currency}
              placeholder="0"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Método de Pago <span className="text-status-danger">*</span>
              </label>
              <Select
                options={paymentMethodOptions}
                value={paymentMethodCode}
                onChange={(v) => setPaymentMethodCode(v as ExpensePaymentMethod)}
                className="w-full"
                buttonClassName="w-full py-2.5"
                popoverClassName="w-full"
              />
            </div>
          </div>

          {/* Row 4: CASH Context Banners */}
          {isCash && (
            <div className="space-y-2">
              {isCashClosed ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-500">Caja cerrada</p>
                      <p className="text-xs text-text-secondary truncate">
                        Debes abrir caja para registrar este gasto en efectivo.
                      </p>
                    </div>
                  </div>
                  {onOpenCashModal && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={onOpenCashModal}
                      className="shrink-0 text-xs px-3 py-1.5"
                    >
                      Abrir caja
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Banknote size={16} className="shrink-0" />
                    <span>Saldrá de la caja abierta</span>
                  </div>
                  <div className="text-text-secondary">
                    Saldo disponible:{' '}
                    <span className="font-bold text-text-primary font-mono">
                      {formatMoney(liveCashBalance, currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Row 5: Fecha del Gasto | Proveedor (2-column Desktop Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <DatePicker
                label="Fecha del Gasto *"
                value={expenseDate}
                onChange={setExpenseDate}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Proveedor (Opcional)
              </label>
              <Select
                options={supplierOptions}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Ninguno / Particular"
                className="w-full"
                buttonClassName="w-full py-2.5"
                popoverClassName="w-full"
              />
            </div>
          </div>

          {/* Row 6: Documento de Referencia (Full Width) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Documento de Referencia (Opcional)
            </label>
            <input
              type="text"
              value={referenceDocument}
              onChange={(e) => setReferenceDocument(e.target.value)}
              placeholder="Ej. Factura #402, Boleta #1290, etc."
              className="w-full px-3.5 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Row 7: Notas Internas (Full Width) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Notas Internas (Opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Observaciones adicionales sobre este gasto..."
              className="w-full px-3.5 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-border-default flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting || isCashClosed || isInsufficientCash}
              className="min-w-[140px]"
            >
              {submitting ? 'Guardando...' : 'Confirmar Gasto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
