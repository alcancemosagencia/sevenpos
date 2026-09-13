import React, { useState } from 'react';
import { User, getUserDisplayName, formatUserRole } from '../../../domain/user/User';
import { Button } from '../../../components/ui/Button';
import { UserX, UserCheck, X, ShieldAlert } from 'lucide-react';

interface DeactivateUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => Promise<{ success: boolean; error?: string }>;
}

export const DeactivateUserModal: React.FC<DeactivateUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isDeactivating = user.active;

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await onConfirm(user.id);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'No se pudo completar la acción.');
      }
    } catch {
      setError('Error inesperado al cambiar estado del usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div
        className="w-full max-w-md bg-surface border border-border-default rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-user-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                isDeactivating
                  ? 'bg-status-danger/10 border-status-danger/20 text-status-danger'
                  : 'bg-status-success/10 border-status-success/20 text-status-success'
              }`}
            >
              {isDeactivating ? <UserX size={20} /> : <UserCheck size={20} />}
            </div>
            <div>
              <h3 id="deactivate-user-title" className="text-base font-bold text-text-primary">
                {isDeactivating ? 'Desactivar usuario' : 'Reactivar usuario'}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {getUserDisplayName(user)} ({formatUserRole(user.role)})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          {isDeactivating
            ? 'El usuario no podrá iniciar sesión ni operar en este terminal. Su historial y registros de ventas se conservarán intactos.'
            : 'El usuario volverá a estar disponible para operar en el punto de venta y acceder según su rol.'}
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-xs text-status-danger flex items-start gap-2">
            <ShieldAlert size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant={isDeactivating ? 'danger' : 'brand'}
            size="md"
            isLoading={isSubmitting}
            onClick={handleConfirm}
          >
            {isDeactivating ? 'Desactivar' : 'Reactivar'}
          </Button>
        </div>
      </div>
    </div>
  );
};
