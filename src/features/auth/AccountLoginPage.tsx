import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import sevenposLogo from '../../assets/branding/sevenpos-logo-horizontal.png';
import onboardingOwnerIllustration from '../../assets/illustrations/onboarding-owner.png';

interface AccountLoginPageProps {
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onGoToRegister: () => void;
  onForgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

export const AccountLoginPage: React.FC<AccountLoginPageProps> = ({
  onLogin,
  onGoToRegister,
  onForgotPassword,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResetSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Ingresa tu correo electrónico.');
      return;
    }

    if (isResetMode) {
      setIsSubmitting(true);
      try {
        const res = await onForgotPassword(email.trim());
        if (res.success) {
          setResetSuccessMessage('Hemos enviado un enlace de recuperación a tu correo.');
        } else {
          setErrorMessage(res.error || 'Error al enviar enlace de recuperación.');
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Error de conexión.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!password) {
      setErrorMessage('Ingresa tu contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onLogin(email.trim(), password);
      if (!res.success) {
        setErrorMessage(res.error || 'Correo o contraseña incorrectos.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error de conexión al autenticar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-surface border border-border-default rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Visual Branding Panel (Hidden on small screens) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-brand-primary/15 via-surface-secondary to-background p-8 flex-col justify-between border-r border-border-default relative overflow-hidden">
          <div className="space-y-4 relative z-10">
            <img src={sevenposLogo} alt="SevenPOS" className="h-8 w-auto object-contain" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold">
              <Sparkles size={13} />
              <span>Cloud Identity</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight leading-tight">
              Punto de Venta Local-First Profesional
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Autentica tu cuenta para vincular este terminal a tu negocio y gestionar tus ventas con máxima rapidez.
            </p>
          </div>

          <div className="relative z-10 flex justify-center py-4">
            <img
              src={onboardingOwnerIllustration}
              alt="SevenPOS Terminal"
              className="max-h-56 w-auto object-contain drop-shadow-xl"
            />
          </div>

          <div className="text-[11px] text-text-tertiary relative z-10">
            SevenPOS Cloud Control Plane &copy; 2026
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-between">
          <div>
            {/* Mobile Header Logo */}
            <div className="lg:hidden flex items-center justify-between mb-6">
              <img src={sevenposLogo} alt="SevenPOS" className="h-7 w-auto object-contain" />
              <span className="text-[11px] font-semibold text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full">
                Acceso Cloud
              </span>
            </div>

            <div className="space-y-1.5 mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                {isResetMode ? 'Recuperar contraseña' : 'Bienvenido a SevenPOS'}
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary">
                {isResetMode
                  ? 'Ingresa tu correo para recibir un enlace de restablecimiento.'
                  : 'Inicia sesión para vincular este dispositivo a tu negocio.'}
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-center gap-2.5">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {resetSuccessMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success text-xs flex items-center gap-2.5">
                <Sparkles size={16} className="shrink-0" />
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-tertiary">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
                  />
                </div>
              </div>

              {!isResetMode && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setErrorMessage(null);
                      }}
                      className="text-xs text-brand-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-tertiary">
                      <Lock size={16} />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="brand"
                size="lg"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight size={16} />}
                className="w-full mt-2 font-bold"
              >
                {isResetMode ? 'Enviar enlace de recuperación' : 'Iniciar sesión'}
              </Button>
            </form>

            {isResetMode && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false);
                    setErrorMessage(null);
                    setResetSuccessMessage(null);
                  }}
                  className="text-xs text-text-secondary hover:text-text-primary underline"
                >
                  Volver a inicio de sesión
                </button>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-border-default text-center">
            <p className="text-xs text-text-secondary">
              ¿No tienes una cuenta SevenPOS?{' '}
              <button
                type="button"
                onClick={onGoToRegister}
                className="font-bold text-brand-primary hover:underline"
              >
                Regístrate aquí
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
