import React, { useState } from 'react';
import { ChangePinInput } from '../types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { KeyRound, Lock, X } from 'lucide-react';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: ChangePinInput) => Promise<{ success: boolean; error?: string }>;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPin) {
      setError('Ingresa tu PIN actual.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setError('El nuevo PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('La confirmación no coincide con el nuevo PIN.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await onSave({ currentPin, newPin, confirmPin });
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'No se pudo actualizar el PIN.');
      }
    } catch {
      setError('Error inesperado al intentar cambiar el PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div
        className="w-full max-w-md bg-surface border border-border-default rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-pin-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 id="change-pin-title" className="text-base font-bold text-text-primary">
                Modificar PIN de acceso
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Ingresa tu clave actual y define un nuevo código de 4 dígitos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="PIN actual"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            leftIcon={<Lock size={15} />}
            autoFocus
          />

          <Input
            label="Nuevo PIN (4 dígitos)"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            leftIcon={<KeyRound size={15} />}
            helperText="Solo números (ej. 1234)"
          />

          <Input
            label="Confirmar nuevo PIN"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            leftIcon={<KeyRound size={15} />}
          />

          {error && (
            <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-xs text-status-danger">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="brand"
              size="md"
              isLoading={isSubmitting}
            >
              Actualizar PIN
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
