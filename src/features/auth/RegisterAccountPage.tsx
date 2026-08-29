import React, { useState } from 'react';
import { Mail, Lock, User, Store, Check, X, ArrowRight, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import sevenposLogo from '../../assets/branding/sevenpos-logo-horizontal.png';

interface RegisterAccountPageProps {
  onRegister: (params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    businessName: string;
    countryCode: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onBackToLogin: () => void;
  defaultBusinessName?: string;
  defaultCountryCode?: string;
}

export const RegisterAccountPage: React.FC<RegisterAccountPageProps> = ({
  onRegister,
  onBackToLogin,
  defaultBusinessName = '',
  defaultCountryCode = 'CL',
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password Policy Checks
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName.trim()) {
      setErrorMessage('Ingresa tu nombre.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Ingresa tu correo electrónico.');
      return;
    }
    if (!businessName.trim()) {
      setErrorMessage('Ingresa el nombre de tu negocio.');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('La contraseña no cumple con los requisitos de seguridad.');
      return;
    }
    if (!doPasswordsMatch) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onRegister({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        businessName: businessName.trim(),
        countryCode,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Error al registrar cuenta.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error de conexión al registrar cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const countryOptions = [
    { value: 'CL', label: 'Chile (CLP / $)' },
    { value: 'CO', label: 'Colombia (COP / $)' },
    { value: 'VE', label: 'Venezuela (VES / USD)' },
  ];

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl bg-surface border border-border-default rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 space-y-6">
        <div className="flex items-center justify-between">
          <img src={sevenposLogo} alt="SevenPOS" className="h-7 w-auto object-contain" />
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Volver a iniciar sesión</span>
          </button>
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold">
            <Sparkles size={13} />
            <span>Crear Cuenta Propietario</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Crea tu cuenta SevenPOS
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Registra tus datos y vincula tu negocio cloud para acceder desde cualquier terminal.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Personal Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              1. Datos del Propietario
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    placeholder="Ej. José"
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
                  placeholder="Ej. Pérez"
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
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
                  placeholder="jose@mipulperia.cl"
                  className="w-full pl-9 pr-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
          </div>

          {/* Section: Business Info */}
          <div className="space-y-3 pt-2 border-t border-border-default">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              2. Datos del Negocio
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-text-secondary mb-1">Nombre comercial *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
                    <Store size={15} />
                  </div>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Ej. Minimarket Don Pepe"
                    className="w-full pl-9 pr-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">País *</label>
                <Select
                  options={countryOptions}
                  value={countryCode}
                  onChange={setCountryCode}
                />
              </div>
            </div>
          </div>

          {/* Section: Password & Confirmation */}
          <div className="space-y-3 pt-2 border-t border-border-default">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              3. Seguridad y Contraseña
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            {/* Password Validation Indicators */}
            <div className="p-3 bg-surface-secondary/60 rounded-xl border border-border-default/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-status-success font-medium' : 'text-text-tertiary'}`}>
                {hasMinLength ? <Check size={13} /> : <X size={13} />}
                <span>8+ caracteres</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-status-success font-medium' : 'text-text-tertiary'}`}>
                {hasUpperCase ? <Check size={13} /> : <X size={13} />}
                <span>1 Mayúscula</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-status-success font-medium' : 'text-text-tertiary'}`}>
                {hasNumber ? <Check size={13} /> : <X size={13} />}
                <span>1 Número</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-status-success font-medium' : 'text-text-tertiary'}`}>
                {hasSpecialChar ? <Check size={13} /> : <X size={13} />}
                <span>1 Especial (!@#)</span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            variant="brand"
            size="lg"
            isLoading={isSubmitting}
            disabled={!isPasswordValid || !doPasswordsMatch}
            rightIcon={<ArrowRight size={16} />}
            className="w-full font-bold pt-3"
          >
            Crear cuenta y continuar
          </Button>
        </form>
      </div>
    </div>
  );
};
