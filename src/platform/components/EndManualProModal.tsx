import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { platformAdminService } from '../services/PlatformAdminService';

interface EndManualProModalProps {
  businessId: string;
  businessName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EndManualProModal: React.FC<EndManualProModalProps> = ({
  businessId,
  businessName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('FINALIZACION_MANUAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await platformAdminService.endManualPro(businessId, reason);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Error al finalizar acceso PRO.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150 font-sans">
      <div className="w-full max-w-md bg-surface border border-border-default rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-default flex items-center justify-between bg-error/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-error/10 text-error">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Finalizar Acceso PRO
              </h2>
              <p className="text-xs text-text-secondary truncate max-w-[240px]">
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 flex items-start gap-2.5 text-xs text-error font-medium">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-xs text-text-secondary leading-relaxed">
            Esta acción marcará la suscripción manual como <strong>Expirada</strong> y la cuenta retornará al plan <strong>FREE</strong>.
          </p>

          <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle text-[11px] text-text-secondary space-y-1">
            <div className="font-semibold text-text-primary">Garantías de seguridad:</div>
            <div>&bull; Ningún dato (productos, usuarios, ventas) será eliminado.</div>
            <div>&bull; Los contratos y eventos previos se conservan de forma inmutable.</div>
            <div>&bull; Los límites gratuitos se aplicarán según el modelo canónico de SevenPOS.</div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Motivo de Finalización
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Término de período de prueba beta"
              className="w-full px-3 py-2 bg-surface-secondary text-text-primary text-xs font-medium rounded-xl border border-border-default focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              required
            />
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
              className="px-5 py-2 text-xs font-semibold bg-error hover:bg-error/90 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Finalizando...' : 'Confirmar Retorno a FREE'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
};
