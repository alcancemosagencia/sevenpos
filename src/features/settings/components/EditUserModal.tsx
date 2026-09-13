import React, { useState } from 'react';
import { User, getUserDisplayName } from '../../../domain/user/User';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { UserCog, X, ShieldAlert, Save } from 'lucide-react';

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    userId: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [prevUser, setPrevUser] = useState<User | null>(user);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user !== prevUser) {
    setPrevUser(user);
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setEmail(user?.email || '');
    setError(null);
  }

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('El nombre del usuario es obligatorio.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await onSave({
        userId: user.id,
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email: email.trim() || null,
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'No se pudo actualizar el usuario.');
      }
    } catch {
      setError('Error inesperado al actualizar el usuario.');
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
        aria-labelledby="edit-user-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <UserCog size={20} />
            </div>
            <div>
              <h3 id="edit-user-title" className="text-base font-bold text-text-primary">
                Editar usuario
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Modifica los datos de {getUserDisplayName(user)}.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ej. Ana"
              autoFocus
              required
            />
            <Input
              label="Apellido (opcional)"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ej. Morales"
            />
          </div>

          <Input
            label="Correo electrónico (opcional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ana@ejemplo.com"
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
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="brand"
              size="md"
              isLoading={isSubmitting}
              leftIcon={<Save size={15} />}
            >
              Guardar cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
