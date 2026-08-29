import React, { useState } from 'react';
import { ShieldCheck, Store, Mail, Lock, User, ArrowRight, X, AlertCircle, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface LinkAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  localBusinessName: string;
  localCountryCode: string;
  localOwnerFirstName?: string;
  localOwnerLastName?: string;
  onLinkWithNewAccount: (params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; requiresEmailVerification?: boolean; error?: string }>;
  onLinkWithExistingAccount: (
    email: string,
    pass: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export const LinkAccountModal: React.FC<LinkAccountModalProps> = ({
  isOpen,
  onClose,
  localBusinessName,
  localCountryCode,
  localOwnerFirstName = '',
  localOwnerLastName = '',
  onLinkWithNewAccount,
  onLinkWithExistingAccount,
}) => {
  const [mode, setMode] = useState<'create' | 'existing'>('create');
  const [firstName, setFirstName] = useState(localOwnerFirstName);
  const [lastName, setLastName] = useState(localOwnerLastName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Ingresa tu correo electrónico.');
      return;
    }

    if (mode === 'create') {
      if (!firstName.trim()) {
        setErrorMessage('Ingresa tu nombre.');
        return;
      }
      if (!isPasswordValid) {
        setErrorMessage('La contraseña no cumple con los requisitos mínimos de seguridad.');
        return;
      }
      if (!doPasswordsMatch) {
        setErrorMessage('Las contraseñas no coinciden.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await onLinkWithNewAccount({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Error al vincular cuenta cloud.');
        } else {
          onClose();
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Error de conexión al vincular cuenta.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!password) {
        setErrorMessage('Ingresa tu contraseña.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await onLinkWithExistingAccount(email.trim(), password);
        if (!res.success) {
          setErrorMessage(res.error || 'Correo o contraseña incorrectos.');
        } else {
          onClose();
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Error al iniciar sesión cloud.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface border border-border-default rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
        >
          <X size={18} />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold">
            <ShieldCheck size={14} />
            <span>Cloud Identity</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary">
            Protege y vincula tu negocio
          </h2>
          <p className="text-xs text-text-secondary">
            Vincula este negocio a tu cuenta SevenPOS para poder acceder desde otros dispositivos sin perder tus datos locales.
          </p>
        </div>

        {/* Existing Business Badge */}
        <div className="p-3.5 bg-surface-secondary border border-border-default rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <Store size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Negocio local detectado
            </p>
            <p className="text-sm font-bold text-text-primary truncate">{localBusinessName}</p>
            <p className="text-[11px] text-text-secondary">País: {localCountryCode}</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 p-1 bg-surface-secondary rounded-xl border border-border-default text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg transition-colors ${
              mode === 'create'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Crear cuenta SevenPOS
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('existing');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg transition-colors ${
              mode === 'existing'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Ya tengo una cuenta
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'create' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Nombre *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full pl-9 pr-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Apellido</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Tu apellido"
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Correo electrónico *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
                <Mail size={15} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full pl-9 pr-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Contraseña *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
                <Lock size={15} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {mode === 'create' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Confirmar contraseña *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="p-2.5 bg-surface-secondary/60 rounded-xl border border-border-default/60 grid grid-cols-2 gap-1.5 text-[10px]">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-status-success font-medium' : 'text-text-tertiary'}`}>
                  {hasMinLength ? <Check size={12} /> : <X size={12} />}
                  <span>8+ caracteres</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-status-success font-medium' : 'text-text-tertiary'}`}>
                  {hasUpperCase ? <Check size={12} /> : <X size={12} />}
                  <span>1 Mayúscula</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-status-success font-medium' : 'text-text-tertiary'}`}>
                  {hasNumber ? <Check size={12} /> : <X size={12} />}
                  <span>1 Número</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-status-success font-medium' : 'text-text-tertiary'}`}>
                  {hasSpecialChar ? <Check size={12} /> : <X size={12} />}
                  <span>1 Especial</span>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-default">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
              Ahora no
            </Button>
            <Button
              type="submit"
              variant="brand"
              size="md"
              isLoading={isSubmitting}
              disabled={mode === 'create' && (!isPasswordValid || !doPasswordsMatch)}
              rightIcon={<ArrowRight size={15} />}
            >
              {mode === 'create' ? 'Vincular y Continuar' : 'Iniciar sesión y Vincular'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
