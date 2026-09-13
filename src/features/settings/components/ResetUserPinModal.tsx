import React, { useState } from 'react';
import { User, getUserDisplayName } from '../../../domain/user/User';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { KeyRound, Lock, X, ShieldAlert } from 'lucide-react';

interface ResetUserPinModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
}

export const ResetUserPinModal: React.FC<ResetUserPinModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(newPin)) {
      setError('El nuevo PIN debe tener entre 4 y 6 dígitos numéricos.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('La confirmación de PIN no coincide.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await onSave(user.id, newPin);
      if (res.success) {
        handleClose();
      } else {
        setError(res.error || 'No se pudo restablecer el PIN.');
      }
    } catch {
      setError('Error inesperado al restablecer el PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
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
        aria-labelledby="reset-pin-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 id="reset-pin-title" className="text-base font-bold text-text-primary">
                Restablecer PIN
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Define un nuevo PIN para {getUserDisplayName(user)}.
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
            label="Nuevo PIN (4–6 dígitos)"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••"
            leftIcon={<KeyRound size={15} />}
            autoFocus
            helperText="Solo números (ej. 1234)"
          />

          <Input
            label="Confirmar nuevo PIN"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••"
            leftIcon={<Lock size={15} />}
          />

          {error && (
            <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-xs text-status-danger flex items-start gap-2">
              <ShieldAlert size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2.5">
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
              Guardar PIN
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
