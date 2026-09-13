import React, { useState, useEffect } from 'react';
import { User, getUserDisplayName, formatUserRole } from '../../domain/user/User';
import { useAuth } from '../../context/AuthContext';
import { useOperationalSession } from '../../context/OperationalSessionContext';
import { repositoryFactory } from '../../infrastructure/repositories/RepositoryFactory';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { UserCheck, X, ShieldAlert, ArrowLeft, Delete } from 'lucide-react';

export const FastSwitchUserModal: React.FC = () => {
  const { businessId } = useAuth();
  const {
    currentOperator,
    isFastSwitchModalOpen,
    closeFastSwitchModal,
    verifyAndSwitchOperator,
  } = useOperationalSession();

  const currentBusinessId = businessId || 'primary-business';
  const opUserService = repositoryFactory.getOperationalUserService();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isFastSwitchModalOpen) {
      void (async () => {
        try {
          const list = await opUserService.getActiveUsers(currentBusinessId);
          setUsers(list);
          setSelectedUser(null);
          setPin('');
          setError(null);
        } catch (err) {
          console.error('Failed to load active users for fast switch:', err);
        }
      })();
    }
  }, [isFastSwitchModalOpen, currentBusinessId, opUserService]);

  if (!isFastSwitchModalOpen) return null;

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setPin('');
    setError(null);
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
    setPin('');
    setError(null);
  };

  const handleDigitClick = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUser) return;
    if (pin.length < 4) {
      setError('Ingresa tu PIN de 4 a 6 dígitos.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await verifyAndSwitchOperator(selectedUser.id, pin);
      if (!res.success) {
        setError(res.error || 'PIN incorrecto.');
        setPin('');
      }
    } catch {
      setError('Error inesperado al verificar el PIN.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div
        className="w-full max-w-sm bg-surface border border-border-default rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="switch-user-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {selectedUser && (
              <button
                type="button"
                onClick={handleBackToUsers}
                disabled={isSubmitting}
                className="p-1.5 -ml-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                title="Volver a lista de operadores"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h3 id="switch-user-title" className="text-base font-bold text-text-primary">
                {selectedUser ? 'Ingresa tu PIN' : 'Cambiar de operador'}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {selectedUser
                  ? `Operador: ${getUserDisplayName(selectedUser)}`
                  : 'Selecciona quién está utilizando la caja'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeFastSwitchModal}
            disabled={isSubmitting}
            className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1: User Selection List */}
        {!selectedUser ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {users.map((user) => {
              const isCurrent = user.id === currentOperator?.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-brand-primary bg-brand-primary/5 text-text-primary ring-1 ring-brand-primary/30'
                      : 'border-border-default bg-surface-secondary/30 hover:border-border-hover text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={getUserDisplayName(user)} size="md" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {getUserDisplayName(user)}
                      </p>
                      <p className="text-[11px] text-text-tertiary truncate">
                        {formatUserRole(user.role)}
                      </p>
                    </div>
                  </div>

                  {isCurrent ? (
                    <Badge variant="brand" size="sm">
                      En sesión
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Seleccionar
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Step 2: PIN Numpad Screen */
          <div className="space-y-4">
            {/* PIN Dots display */}
            <div className="flex items-center justify-center gap-3 py-2">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const filled = idx < pin.length;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      filled
                        ? 'bg-brand-primary border-brand-primary scale-110 shadow-xs'
                        : 'bg-surface-secondary/50 border-border-default'
                    }`}
                  />
                );
              })}
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-status-danger/10 border border-status-danger/20 text-xs text-status-danger flex items-start gap-2">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Tactical Numpad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitClick(digit)}
                  disabled={isSubmitting}
                  className="h-12 rounded-2xl border border-border-default bg-surface hover:bg-surface-secondary/60 text-lg font-bold text-text-primary transition-all active:scale-95 flex items-center justify-center shadow-xs"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                disabled={isSubmitting || pin.length === 0}
                className="h-12 rounded-2xl border border-border-default bg-surface hover:bg-surface-secondary/60 text-xs font-semibold text-text-secondary transition-all active:scale-95 flex items-center justify-center"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => handleDigitClick('0')}
                disabled={isSubmitting}
                className="h-12 rounded-2xl border border-border-default bg-surface hover:bg-surface-secondary/60 text-lg font-bold text-text-primary transition-all active:scale-95 flex items-center justify-center shadow-xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDeleteDigit}
                disabled={isSubmitting || pin.length === 0}
                className="h-12 rounded-2xl border border-border-default bg-surface hover:bg-surface-secondary/60 text-text-secondary transition-all active:scale-95 flex items-center justify-center"
              >
                <Delete size={18} />
              </button>
            </div>

            <Button
              type="button"
              variant="brand"
              size="md"
              onClick={() => handleVerify()}
              disabled={pin.length < 4 || isSubmitting}
              isLoading={isSubmitting}
              className="w-full"
              leftIcon={<UserCheck size={16} />}
            >
              Confirmar operador
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
