import React, { useState, useEffect } from 'react';
import { PaymentMethod } from '../../../domain/sales/PaymentMethod';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export interface CheckoutPaymentRow {
  paymentMethodId: string;
  amount: number;
  receivedAmount?: number | null;
  changeAmount?: number | null;
}

interface PosCheckoutModalProps {
  isOpen: boolean;
  total: number;
  paymentMethods: PaymentMethod[];
  customerName: string;
  isSubmitting: boolean;
  externalError?: string | null;
  onClose: () => void;
  onConfirmSale: (payments: CheckoutPaymentRow[], note?: string) => void;
}

export const PosCheckoutModal: React.FC<PosCheckoutModalProps> = ({
  isOpen,
  total,
  paymentMethods,
  customerName,
  isSubmitting,
  externalError,
  onClose,
  onConfirmSale,
}) => {
  const [payments, setPayments] = useState<CheckoutPaymentRow[]>([]);
  const [cashReceivedStr, setCashReceivedStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Initialize single payment method with CASH (or first active method)
  useEffect(() => {
    if (isOpen) {
      const defaultCash = paymentMethods.find((m) => m.code === 'CASH') || paymentMethods[0];
      if (defaultCash) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPayments([
          {
            paymentMethodId: defaultCash.id,
            amount: total,
            receivedAmount: total,
            changeAmount: 0,
          },
        ]);
        setCashReceivedStr(String(total));
      } else {
        setPayments([]);
      }
      setNote('');
      setError(null);
    }
  }, [isOpen, total, paymentMethods]);

  if (!isOpen) return null;

  const isMultiPayment = payments.length > 1;
  const currentPaymentSum = payments.reduce((sum, p) => sum + (Number.isSafeInteger(p.amount) ? p.amount : 0), 0);
  const remainingToCover = total - currentPaymentSum;

  const getMethod = (id: string) => paymentMethods.find((m) => m.id === id);

  const handleUpdatePaymentMethod = (index: number, newMethodId: string) => {
    const next = [...payments];
    const method = getMethod(newMethodId);
    const row = next[index];
    row.paymentMethodId = newMethodId;

    if (method?.code === 'CASH') {
      row.receivedAmount = row.amount;
      row.changeAmount = 0;
      setCashReceivedStr(String(row.amount));
    } else {
      row.receivedAmount = null;
      row.changeAmount = null;
    }
    setPayments(next);
    setError(null);
  };

  const handleUpdatePaymentAmount = (index: number, newAmount: number) => {
    const next = [...payments];
    const row = next[index];
    row.amount = Math.max(0, newAmount);

    const method = getMethod(row.paymentMethodId);
    if (method?.code === 'CASH') {
      const rec = row.receivedAmount || row.amount;
      row.changeAmount = Math.max(0, rec - row.amount);
    }
    setPayments(next);
    setError(null);
  };

  const handleAddPaymentRow = () => {
    const available = paymentMethods.filter((m) => !payments.some((p) => p.paymentMethodId === m.id));
    const nextMethod = available[0] || paymentMethods[0];
    if (!nextMethod) return;

    const amountForNew = Math.max(0, remainingToCover);
    setPayments([
      ...payments,
      {
        paymentMethodId: nextMethod.id,
        amount: amountForNew,
        receivedAmount: nextMethod.code === 'CASH' ? amountForNew : null,
        changeAmount: 0,
      },
    ]);
  };

  const handleRemovePaymentRow = (index: number) => {
    if (payments.length <= 1) return;
    const next = payments.filter((_, i) => i !== index);
    // If only 1 remains, give it full remaining amount
    if (next.length === 1) {
      next[0].amount = total;
      const method = getMethod(next[0].paymentMethodId);
      if (method?.code === 'CASH') {
        next[0].receivedAmount = total;
        next[0].changeAmount = 0;
        setCashReceivedStr(String(total));
      }
    }
    setPayments(next);
  };

  const handleCashReceivedChange = (valStr: string) => {
    setCashReceivedStr(valStr);
    const num = Number(valStr);
    if (isNaN(num) || num < 0) return;

    const next = [...payments];
    const cashRow = next.find((p) => getMethod(p.paymentMethodId)?.code === 'CASH');
    if (cashRow) {
      cashRow.receivedAmount = num;
      cashRow.changeAmount = Math.max(0, num - cashRow.amount);
      setPayments(next);
    }
  };

  const handleQuickCash = (amount: number) => {
    setCashReceivedStr(String(amount));
    const next = [...payments];
    const cashRow = next.find((p) => getMethod(p.paymentMethodId)?.code === 'CASH');
    if (cashRow) {
      cashRow.receivedAmount = amount;
      cashRow.changeAmount = Math.max(0, amount - cashRow.amount);
      setPayments(next);
    }
  };

  const handleFinalize = () => {
    if (currentPaymentSum !== total) {
      setError(`La suma de los pagos ($${currentPaymentSum.toLocaleString('es-ES')}) debe ser exactamente igual al total ($${total.toLocaleString('es-ES')}).`);
      return;
    }

    // Validate cash received
    for (const p of payments) {
      const method = getMethod(p.paymentMethodId);
      if (method?.code === 'CASH') {
        const rec = p.receivedAmount != null ? p.receivedAmount : p.amount;
        if (rec < p.amount) {
          setError(`El dinero en efectivo recibido ($${rec.toLocaleString('es-ES')}) no puede ser menor al importe a pagar ($${p.amount.toLocaleString('es-ES')}).`);
          return;
        }
      }
    }

    onConfirmSale(payments, note.trim() || undefined);
  };

  // Find cash row for single payment change view
  const singleCashRow = !isMultiPayment && getMethod(payments[0]?.paymentMethodId)?.code === 'CASH' ? payments[0] : null;
  const cashChange = singleCashRow && singleCashRow.receivedAmount ? Math.max(0, singleCashRow.receivedAmount - total) : 0;

  const methodOptions = paymentMethods.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm dark:bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-secondary/40">
          <div>
            <h2 className="text-base font-bold text-text-primary">Cobrar Venta</h2>
            <p className="text-xs text-text-secondary">Cliente: <span className="font-semibold text-text-primary">{customerName}</span></p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-text-tertiary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          {/* Error Banner */}
          {(error || externalError) && (
            <div className="p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/20 text-xs font-semibold text-status-danger flex items-start gap-2 animate-in fade-in-0 duration-150">
              <span>{error || externalError}</span>
            </div>
          )}

          {/* Total Box */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20">
            <div>
              <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">Total a Cobrar</span>
              <p className="text-xs text-text-secondary">Moneda: CLP</p>
            </div>
            <span className="text-3xl font-extrabold text-brand-primary tracking-tight">
              ${total.toLocaleString('es-ES')}
            </span>
          </div>

          {/* Payment Methods */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                {isMultiPayment ? 'Métodos de pago (Multipago)' : 'Método de pago'}
              </label>
              {!isMultiPayment && paymentMethods.length > 1 && (
                <button
                  type="button"
                  onClick={handleAddPaymentRow}
                  className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Dividir pago (+ Agregar)</span>
                </button>
              )}
            </div>

            {/* List of Payment Rows */}
            {payments.map((p, index) => {
              const currentMethod = getMethod(p.paymentMethodId);
              return (
                <div
                  key={index}
                  className="p-3.5 rounded-xl bg-surface-secondary/60 border border-border-default flex flex-col gap-3"
                >
                  <div className="flex items-center gap-2">
                    {/* Method Selector using SevenPOS Select */}
                    <div className="flex-1 min-w-0">
                      <Select
                        options={methodOptions}
                        value={p.paymentMethodId}
                        onChange={(val) => handleUpdatePaymentMethod(index, val)}
                        buttonClassName="py-2 text-xs font-bold"
                      />
                    </div>

                    {/* Amount Applied Input */}
                    <div className="w-36 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-tertiary">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={p.amount}
                        onChange={(e) => handleUpdatePaymentAmount(index, Number(e.target.value))}
                        disabled={!isMultiPayment}
                        className="w-full pl-6 pr-3 py-2 bg-surface border border-border-default rounded-xl text-xs font-bold text-text-primary text-right focus:outline-none focus:border-brand-primary transition-all disabled:opacity-80"
                      />
                    </div>

                    {/* Delete row button (if multi-payment) */}
                    {isMultiPayment && (
                      <button
                        type="button"
                        onClick={() => handleRemovePaymentRow(index)}
                        className="p-2 rounded-lg text-text-tertiary hover:text-status-danger hover:bg-status-danger/10 transition-colors"
                        title="Quitar este pago"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Cash Change Calculation (for this row if Cash) */}
                  {currentMethod?.code === 'CASH' && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-border-default/40">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <label className="text-[11px] font-semibold text-text-secondary">Efectivo recibido</label>
                          <div className="relative mt-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-tertiary">
                              $
                            </span>
                            <input
                              type="number"
                              min={p.amount}
                              value={cashReceivedStr}
                              onChange={(e) => handleCashReceivedChange(e.target.value)}
                              placeholder={String(p.amount)}
                              className="w-full pl-6 pr-3 py-1.5 bg-surface border border-border-default rounded-lg text-xs font-bold text-text-primary focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                        </div>

                        {/* Calculated Change */}
                        <div className="w-36 text-right">
                          <span className="text-[11px] font-semibold text-text-secondary">Vuelto / Cambio</span>
                          <p className="text-base font-extrabold text-status-success mt-1">
                            ${(p.changeAmount || cashChange).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>

                      {/* Quick Cash Buttons */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                        <button
                          type="button"
                          onClick={() => handleQuickCash(p.amount)}
                          className="px-2 py-1 rounded-md bg-surface border border-border-default text-[11px] font-semibold text-text-secondary hover:text-brand-primary hover:border-brand-primary transition-all shrink-0"
                        >
                          Exacto (${p.amount.toLocaleString('es-ES')})
                        </button>
                        {[1000, 2000, 5000, 10000, 20000].map((quick) => (
                          <button
                            key={quick}
                            type="button"
                            onClick={() => handleQuickCash(quick)}
                            className="px-2 py-1 rounded-md bg-surface border border-border-default text-[11px] font-semibold text-text-secondary hover:text-brand-primary hover:border-brand-primary transition-all shrink-0"
                          >
                            ${quick.toLocaleString('es-ES')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Multipago Add Row Button */}
            {isMultiPayment && (
              <button
                type="button"
                onClick={handleAddPaymentRow}
                className="py-2 px-3 rounded-xl border border-dashed border-border-default hover:border-brand-primary text-xs font-semibold text-brand-primary hover:bg-brand-primary/5 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />
                <span>+ Agregar otro método de pago</span>
              </button>
            )}

            {/* Multipago Total Reconciliation Status */}
            {isMultiPayment && (
              <div
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                  currentPaymentSum === total
                    ? 'bg-status-success/10 border-status-success/20 text-status-success'
                    : 'bg-status-warning/10 border-status-warning/20 text-status-warning'
                }`}
              >
                <span>Total asignado: ${currentPaymentSum.toLocaleString('es-ES')}</span>
                <span>
                  {currentPaymentSum === total
                    ? '✓ Monto completo cubierto'
                    : `Faltan: $${Math.max(0, total - currentPaymentSum).toLocaleString('es-ES')}`}
                </span>
              </div>
            )}
          </div>

          {/* Note Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Observación / Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Entregar en portería, pedido especial..."
              className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-primary"
            />
          </div>

          {error && <p className="text-xs font-medium text-status-danger">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-default bg-surface-secondary/20">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            leftIcon={<CheckCircle2 size={16} />}
            onClick={handleFinalize}
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Finalizar Venta (${total.toLocaleString('es-ES')})
          </Button>
        </div>
      </div>
    </div>
  );
};
