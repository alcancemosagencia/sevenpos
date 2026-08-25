import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { MoneyInput } from '../../../components/ui/MoneyInput';
import { Badge } from '../../../components/ui/Badge';
import { CurrencyCode } from '../../../types/country';
import { formatMoney } from '../../../domain/common/money/Money';
import { calculateCashDifference } from '../../../domain/cash/CashSessionMath';
import { CashSessionSummary } from '../../../domain/cash/CashSession';
import { Lock, X, AlertCircle, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

interface CloseCashBlindModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClose: (
    countedAmount: number,
    previewExpectedCash: number,
    note: string | null
  ) => Promise<void>;
  currency: CurrencyCode;
  summary: CashSessionSummary | null;
  userName: string;
}

export const CloseCashBlindModal: React.FC<CloseCashBlindModalProps> = ({
  isOpen,
  onClose,
  onConfirmClose,
  currency,
  summary,
  userName,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [countedAmount, setCountedAmount] = useState<number>(0);
  const [closingNote, setClosingNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(1);
      setCountedAmount(0);
      setClosingNote('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const expectedCash = summary?.expectedCash || 0;
  const difference = calculateCashDifference(countedAmount, expectedCash);

  const handleProceedToReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (countedAmount < 0) {
      setError('El monto contado no puede ser negativo.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleFinalConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirmClose(countedAmount, expectedCash, closingNote.trim() || null);
      setStep(1);
      setCountedAmount(0);
      setClosingNote('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cerrar la caja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm dark:bg-black/80 animate-in fade-in duration-150">
      <div className="bg-surface border border-border-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {step === 1 ? 'Cierre de turno — Arqueo a ciegas' : 'Resultado de reconciliación'}
              </h3>
              <p className="text-xs text-muted-foreground">Paso {step} de 2 • {userName}</p>
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

        {/* Step 1: Blind Count */}
        {step === 1 && (
          <form onSubmit={handleProceedToReconciliation} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-500">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-muted/20 p-4 rounded-xl space-y-1.5 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground text-sm">Arqueo a ciegas (Blind Count)</p>
              <p>
                Por seguridad y transparencia contable, cuenta físicamente todo el efectivo en la gaveta e introduce el total real sin sesgo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Efectivo físico contado en gaveta ({currency}) *
              </label>
              <MoneyInput
                valueMinor={countedAmount}
                onChangeMinor={(val) => setCountedAmount(val ?? 0)}
                currency={currency}
                placeholder="0"
                className="w-full text-xl font-bold"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nota o motivo de cierre (opcional)
              </label>
              <textarea
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                placeholder="Observaciones del arqueo..."
                rows={2}
                className="w-full bg-input/20 border border-input focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="flex items-center gap-2"
              >
                <span>Continuar a conciliación</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Reconciliation Comparison */}
        {step === 2 && (
          <div className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-500">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Shift Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50 text-muted-foreground">
                <span>Fondo inicial de apertura:</span>
                <span className="font-semibold text-foreground">
                  {formatMoney(summary?.openingAmount || 0, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50 text-muted-foreground">
                <span>Ventas en efectivo (+):</span>
                <span className="font-semibold text-emerald-500">
                  +{formatMoney(summary?.totalSaleCash || 0, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50 text-muted-foreground">
                <span>Ingresos manuales (+):</span>
                <span className="font-semibold text-foreground">
                  +{formatMoney(summary?.totalCashIn || 0, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50 text-muted-foreground">
                <span>Retiros / Salidas (-):</span>
                <span className="font-semibold text-amber-500">
                  -{formatMoney(summary?.totalCashOut || 0, currency)}
                </span>
              </div>
            </div>

            {/* Reconciliation Comparison Box */}
            <div className="bg-muted/30 border border-border p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Saldo esperado en sistema:</span>
                <span className="font-bold text-foreground text-base">
                  {formatMoney(expectedCash, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Efectivo físico contado:</span>
                <span className="font-bold text-foreground text-base">
                  {formatMoney(countedAmount, currency)}
                </span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-center">
                <span className="font-bold text-sm text-foreground">Diferencia de arqueo:</span>
                <div>
                  {difference === 0 ? (
                    <Badge variant="success" size="md" className="flex items-center gap-1 font-bold">
                      <CheckCircle2 size={14} />
                      <span>$0 (Cuadre exacto)</span>
                    </Badge>
                  ) : difference > 0 ? (
                    <Badge variant="brand" size="md" className="font-bold">
                      +{formatMoney(difference, currency)} (Sobrante)
                    </Badge>
                  ) : (
                    <Badge variant="danger" size="md" className="flex items-center gap-1 font-bold">
                      <AlertTriangle size={14} />
                      <span>{formatMoney(difference, currency)} (Faltante)</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {closingNote && (
              <p className="text-xs text-muted-foreground italic">
                Nota: &ldquo;{closingNote}&rdquo;
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>Recontar</span>
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleFinalConfirm}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <Lock size={16} />
                <span>{isSubmitting ? 'Cerrando turno...' : 'Confirmar y cerrar turno'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
