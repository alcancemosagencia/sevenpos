import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { MoneyInput } from '../../../components/ui/MoneyInput';
import { CurrencyCode } from '../../../types/country';
import { LockOpen, X, AlertCircle } from 'lucide-react';

interface OpenCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (openingAmount: number, note: string | null) => Promise<void>;
  currency: CurrencyCode;
  userName: string;
  registerName: string;
}

export const OpenCashModal: React.FC<OpenCashModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currency,
  userName,
  registerName,
}) => {
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (openingAmount < 0) {
      setError('El monto inicial no puede ser negativo.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(openingAmount, note.trim() || null);
      setOpeningAmount(0);
      setNote('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al abrir la caja.');
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
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <LockOpen size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Abrir caja</h3>
              <p className="text-xs text-muted-foreground">{registerName}</p>
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

          <div className="bg-muted/20 p-3 rounded-xl space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Cajero:</span>
              <strong className="text-foreground">{userName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Fecha / Hora:</span>
              <strong className="text-foreground">Ahora (Automático)</strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monto inicial en caja ({currency}) *
            </label>
            <MoneyInput
              valueMinor={openingAmount}
              onChangeMinor={(val) => setOpeningAmount(val ?? 0)}
              currency={currency}
              placeholder="0"
              className="w-full text-lg font-bold"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Introduce el efectivo base con el que inicia el turno.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nota o comentario (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Turno mañana, billetes chicos..."
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
              <LockOpen size={16} />
              <span>{isSubmitting ? 'Abriendo caja...' : 'Confirmar apertura'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
