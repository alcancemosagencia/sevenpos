import React, { useState } from 'react';
import { UserRole } from '../../../domain/user/User';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { UserPlus, Lock, KeyRound, Shield, X, ShieldAlert, Check } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: UserRole;
  onSave: (data: {
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    pin: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  currentUserRole,
  onSave,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('El nombre del usuario es obligatorio.');
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError('El PIN debe contener entre 4 y 6 dígitos numéricos.');
      return;
    }
    if (pin !== confirmPin) {
      setError('La confirmación de PIN no coincide.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role,
        pin,
      });

      if (res.success) {
        handleClose();
      } else {
        setError(res.error || 'No se pudo crear el usuario.');
      }
    } catch {
      setError('Error inesperado al crear el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setRole('CASHIER');
      setPin('');
      setConfirmPin('');
      setError(null);
      onClose();
    }
  };

  const availableRoles: { id: UserRole; title: string; desc: string }[] = [
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
    ...(currentUserRole === 'OWNER'
      ? [
          {
            id: 'OWNER' as UserRole,
            title: 'Dueño',
            desc: 'Acceso total a configuración, usuarios, auditoría y administración.',
          },
        ]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div
        className="w-full max-w-lg bg-surface border border-border-default rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 id="create-user-title" className="text-base font-bold text-text-primary">
                Nuevo usuario
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Crea un operador para atender en caja o administrar el sistema.
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
            helperText="Opcional. Para identificación o contacto."
          />

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Rol de usuario
            </label>
            <div className="grid grid-cols-1 gap-2">
              {availableRoles.map((r) => {
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Input
              label="PIN de operador (4–6 dígitos)"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              leftIcon={<KeyRound size={15} />}
              helperText="Código numérico personal"
            />
            <Input
              label="Confirmar PIN"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              leftIcon={<Lock size={15} />}
            />
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
              leftIcon={<UserPlus size={15} />}
            >
              Crear usuario
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
