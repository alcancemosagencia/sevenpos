import React, { useState } from 'react';
import { User, UserRole, getUserDisplayName, formatUserRole } from '../../../domain/user/User';
import { Button } from '../../../components/ui/Button';
import { Shield, X, ShieldAlert, Check } from 'lucide-react';

interface ChangeUserRoleModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>;
}

export const ChangeUserRoleModal: React.FC<ChangeUserRoleModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [prevUser, setPrevUser] = useState<User | null>(user);
  const [selectedRole, setSelectedRole] = useState<UserRole>(user?.role || 'CASHIER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user !== prevUser) {
    setPrevUser(user);
    setSelectedRole(user?.role || 'CASHIER');
    setError(null);
  }

  if (!isOpen || !user) return null;

  const rolesList: { id: UserRole; title: string; desc: string }[] = [
    {
      id: 'CASHIER',
      title: 'Cajero',
      desc: 'Cobro en POS, apertura/cierre de turno y consulta de catálogo.',
    },
    {
      id: 'ADMIN',
      title: 'Administrador',
      desc: 'Gestión de catálogo, inventario, compras, gastos y reportes.',
    },
    {
      id: 'OWNER',
      title: 'Dueño',
      desc: 'Acceso total a configuración, usuarios, auditoría y administración.',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === user.role) {
      onClose();
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await onSave(user.id, selectedRole);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'No se pudo cambiar el rol.');
      }
    } catch {
      setError('Error inesperado al cambiar el rol.');
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
        aria-labelledby="change-role-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <h3 id="change-role-title" className="text-base font-bold text-text-primary">
                Cambiar rol de usuario
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Rol actual de {getUserDisplayName(user)}: <strong className="text-text-primary">{formatUserRole(user.role)}</strong>
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
          <div className="grid grid-cols-1 gap-2">
            {rolesList.map((r) => {
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`text-left p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/5 text-text-primary ring-1 ring-brand-primary/30'
                      : 'border-border-default bg-surface-secondary/30 hover:border-border-hover text-text-secondary'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield size={14} className={isSelected ? 'text-brand-primary' : 'text-text-tertiary'} />
                      <span className="text-xs font-bold text-text-primary">{r.title}</span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1">{r.desc}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary text-white'
                        : 'border-border-subtle bg-surface'
                    }`}
                  >
                    {isSelected && <Check size={10} />}
                  </div>
                </button>
              );
            })}
          </div>

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
              leftIcon={<Shield size={15} />}
            >
              Actualizar rol
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
