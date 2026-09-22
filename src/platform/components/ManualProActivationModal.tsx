import React, { useState } from 'react';
import { Sparkles, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DatePicker } from '../../components/ui/DatePicker';
import { ManualReason } from '../types/PlatformTypes';
import { platformAdminService } from '../services/PlatformAdminService';

interface ManualProActivationModalProps {
  businessId: string;
  businessName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualProActivationModal: React.FC<ManualProActivationModalProps> = ({
  businessId,
  businessName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<ManualReason>('TESTER');
  const [interval, setInterval] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  
  // Date calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const [startsAt, setStartsAt] = useState<string>(todayStr);

  const getSuggestedEnd = (start: string, intv: 'MONTHLY' | 'ANNUAL'): string => {
    const d = new Date(start || todayStr);
    if (intv === 'MONTHLY') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setFullYear(d.getFullYear() + 1);
    }
    return d.toISOString().split('T')[0];
  };

  const [periodEnd, setPeriodEnd] = useState<string>(() => getSuggestedEnd(todayStr, 'MONTHLY'));
  
  // Assisted sale fields
  const [amount, setAmount] = useState<string>('');
  const currency = 'CLP';
  const [paymentMethod, setPaymentMethod] = useState<string>('TRANSFER');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const reasonOptions = [
    { value: 'TESTER', label: 'Beta Tester' },
    { value: 'FRIEND_FAMILY', label: 'Cortesía / Familiar' },
    { value: 'ASSISTED_SALE', label: 'Venta Asistida (Cobro Manual)' },
    { value: 'COMPENSATION', label: 'Compensación de Servicio' },
    { value: 'INTERNAL', label: 'Cuenta Interna / Demostración' },
    { value: 'OTHER', label: 'Otro Motivo' },
  ];

  const paymentMethodOptions = [
    { value: 'TRANSFER', label: 'Transferencia Bancaria' },
    { value: 'CASH', label: 'Efectivo' },
    { value: 'OTHER', label: 'Otro Medio' },
  ];

  const handleIntervalChange = (newInterval: 'MONTHLY' | 'ANNUAL') => {
    setInterval(newInterval);
    setPeriodEnd(getSuggestedEnd(startsAt, newInterval));
  };

  const handleStartsAtChange = (newStart: string) => {
    setStartsAt(newStart);
    setPeriodEnd(getSuggestedEnd(newStart, interval));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!startsAt || !periodEnd) {
      setErrorMessage('Debes especificar las fechas de inicio y término del período.');
      return;
    }

    if (new Date(periodEnd) <= new Date(startsAt)) {
      setErrorMessage('La fecha de término debe ser posterior a la fecha de inicio.');
      return;
    }

    let parsedAmount = 0;
    if (reason === 'ASSISTED_SALE') {
      parsedAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;
      if (parsedAmount <= 0) {
        setErrorMessage('Ingresa el monto pagado para la venta asistida.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await platformAdminService.activateManualPro({
        businessId,
        interval,
        startsAt: new Date(startsAt).toISOString(),
        periodEnd: new Date(`${periodEnd}T23:59:59Z`).toISOString(),
        reason,
        amount: parsedAmount,
        currency,
        paymentMethod: reason === 'ASSISTED_SALE' ? paymentMethod : undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Error al activar Plan PRO.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150 font-sans">
      <div className="w-full max-w-lg bg-surface border border-border-default rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-border-default flex items-center justify-between bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Activar Plan PRO Manual
              </h2>
              <p className="text-xs text-text-secondary truncate max-w-[280px]">
                {businessName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-tertiary hover:text-text-primary rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Error notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 flex items-start gap-2.5 text-xs text-error font-medium">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Tipo / Motivo de Activación
            </label>
            <Select
              options={reasonOptions}
              value={reason}
              onChange={(v) => setReason(v as ManualReason)}
              className="w-full"
              buttonClassName="w-full text-xs"
            />
          </div>

          {/* Billing Interval Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Intervalo de Renovación Estimado
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleIntervalChange('MONTHLY')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  interval === 'MONTHLY'
                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                    : 'bg-surface-secondary text-text-secondary border-border-default hover:bg-surface-hover'
                }`}
              >
                Mensual (+1 mes)
              </button>
              <button
                type="button"
                onClick={() => handleIntervalChange('ANNUAL')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  interval === 'ANNUAL'
                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                    : 'bg-surface-secondary text-text-secondary border-border-default hover:bg-surface-hover'
                }`}
              >
                Anual (+1 año)
              </button>
            </div>
          </div>

          {/* Dates: StartsAt & PeriodEnd */}
          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Fecha de Inicio"
              value={startsAt}
              onChange={(val) => handleStartsAtChange(val)}
            />

            <DatePicker
              label="Término del Período"
              value={periodEnd}
              onChange={(val) => setPeriodEnd(val)}
            />
          </div>

          {/* Progressive Fields: ONLY IF ASSISTED SALE */}
          {reason === 'ASSISTED_SALE' && (
            <div className="p-4 bg-surface-secondary rounded-2xl border border-border-subtle space-y-3 animate-in fade-in-50 duration-150">
              <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Datos Comerciales de Venta Asistida</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-secondary">Monto Pagado (Bruto)</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="19990"
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-secondary">Medio de Pago</label>
                  <Select
                    options={paymentMethodOptions}
                    value={paymentMethod}
                    onChange={(v) => setPaymentMethod(v)}
                    className="w-full"
                    buttonClassName="w-full text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-secondary">Referencia / Comprobante (opcional)</label>
                <Input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej: Transf. Santander #94821"
                  className="w-full text-xs"
                />
              </div>
            </div>
          )}

          {/* Internal Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Nota Interna de Auditoría (Privada)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Acceso de prueba beta acordado con dueño..."
              rows={3}
              className="w-full px-3 py-2 bg-surface-secondary text-text-primary text-xs font-medium rounded-xl border border-border-default focus:outline-none focus:ring-2 focus:ring-brand-primary/40 resize-none"
            />
            <p className="text-[10px] text-text-tertiary">
              Visible exclusivamente en SevenPOS Platform. El cliente nunca verá esta nota.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl border border-border-default transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Activando...' : 'Confirmar Activación PRO'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
};
