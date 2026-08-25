import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { MoneyInput } from '../../../components/ui/MoneyInput';
import { CurrencyCode } from '../../../types/country';
import { formatMoney } from '../../../domain/common/money/Money';
import { ArrowDownToLine, ArrowUpFromLine, X, AlertCircle } from 'lucide-react';

interface AddCashMovementModalProps {
  isOpen: boolean;
  initialType?: 'CASH_IN' | 'CASH_OUT';
  onClose: () => void;
  onConfirm: (
    type: 'CASH_IN' | 'CASH_OUT',
    amount: number,
    reason: string,
    note: string | null
  ) => Promise<void>;
  currency: CurrencyCode;
  currentExpectedCash: number;
}

const COMMON_CASH_IN_REASONS = ['Fondo adicional', 'Reposición de cambio', 'Cobro extraordinario', 'Otro'];
const COMMON_CASH_OUT_REASONS = ['Retiro de efectivo', 'Gasto menor de caja', 'Pago de flete / entrega', 'Otro'];

export const AddCashMovementModal: React.FC<AddCashMovementModalProps> = ({
  isOpen,
  initialType = 'CASH_IN',
  onClose,
  onConfirm,
  currency,
  currentExpectedCash,
}) => {
  const [movementType, setMovementType] = useState<'CASH_IN' | 'CASH_OUT'>(initialType);
  const [amount, setAmount] = useState<number>(0);
  const [selectedReason, setSelectedReason] = useState<string>(
    initialType === 'CASH_IN' ? COMMON_CASH_IN_REASONS[0] : COMMON_CASH_OUT_REASONS[0]
  );
  const [customReason, setCustomReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMovementType(initialType);
      setSelectedReason(initialType === 'CASH_IN' ? COMMON_CASH_IN_REASONS[0] : COMMON_CASH_OUT_REASONS[0]);
      setAmount(0);
      setCustomReason('');
      setNote('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const isCashIn = movementType === 'CASH_IN';
  const effectiveReason = selectedReason === 'Otro' ? customReason.trim() : selectedReason;

  const handleTypeChange = (type: 'CASH_IN' | 'CASH_OUT') => {
    setMovementType(type);
    setSelectedReason(type === 'CASH_IN' ? COMMON_CASH_IN_REASONS[0] : COMMON_CASH_OUT_REASONS[0]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('El monto debe ser mayor a cero.');
      return;
    }
    if (!effectiveReason) {
      setError('Debes especificar el motivo del movimiento.');
      return;
    }
    if (movementType === 'CASH_OUT' && currentExpectedCash - amount < 0) {
      setError(
        `Saldo insuficiente en caja. Disponible: ${formatMoney(currentExpectedCash, currency)}`
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(movementType, amount, effectiveReason, note.trim() || null);
      setAmount(0);
      setCustomReason('');
      setNote('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar el movimiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm dark:bg-black/80 animate-in fade-in duration-150">
      <div className="bg-surface border border-border-strong rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isCashIn ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}
            >
              {isCashIn ? <ArrowDownToLine size={20} /> : <ArrowUpFromLine size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isCashIn ? 'Ingreso manual de efectivo' : 'Retiro / Salida de efectivo'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Saldo actual en caja: <strong>{formatMoney(currentExpectedCash, currency)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-500">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => handleTypeChange('CASH_IN')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isCashIn
                  ? 'bg-surface text-emerald-500 shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownToLine size={14} />
              <span>Ingreso (+ Entrada)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('CASH_OUT')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isCashIn
                  ? 'bg-surface text-amber-500 shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowUpFromLine size={14} />
              <span>Salida (- Retiro)</span>
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monto del {isCashIn ? 'ingreso' : 'retiro'} ({currency}) *
            </label>
            <MoneyInput
              valueMinor={amount}
              onChangeMinor={(val) => setAmount(val ?? 0)}
              currency={currency}
              placeholder="0"
              className="w-full text-lg font-bold"
              autoFocus
            />
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Motivo *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(isCashIn ? COMMON_CASH_IN_REASONS : COMMON_CASH_OUT_REASONS).map((reason) => (
                <button
                  type="button"
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border text-left transition-all ${
                    selectedReason === reason
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {selectedReason === 'Otro' && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Escribe el motivo..."
                className="w-full mt-2 bg-input/20 border border-input focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                required
              />
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nota o detalle adicional (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Detalle o referencia del comprobante..."
              rows={2}
              className="w-full bg-input/20 border border-input focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isCashIn ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
              <span>{isSubmitting ? 'Registrando...' : isCashIn ? 'Registrar ingreso' : 'Registrar retiro'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
