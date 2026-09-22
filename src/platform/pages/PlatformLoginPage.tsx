import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import sevenposLogo from '../../assets/branding/sevenpos-logo-horizontal.png';
import { usePlatformAuth } from '../context/PlatformAuthContext';

export const PlatformLoginPage: React.FC = () => {
  const { signIn, authError, isLoading } = usePlatformAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Ingresa tu correo y contraseña de administrador.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signIn(email.trim(), password);
      if (!res.success) {
        setLocalError(res.error || 'Error al iniciar sesión.');
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md bg-surface border border-border-default rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img src={sevenposLogo} alt="SevenPOS" className="h-7 w-auto object-contain" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold">
            <Sparkles size={13} />
            <span>Platform Super Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Acceso a la Plataforma
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed max-w-xs mx-auto">
            Panel interno para operadores y administradores de SevenPOS.
          </p>
        </div>

        {/* Error Alert */}
        {displayedError && (
          <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 flex items-start gap-3 animate-in fade-in-50 duration-200">
            <ShieldAlert size={18} className="text-error shrink-0 mt-0.5" />
            <div className="text-xs text-error font-medium leading-relaxed">
              {displayedError}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Correo de Administrador
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sevenpos.pro"
              disabled={isSubmitting || isLoading}
              required
              leftIcon={<Mail size={16} />}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Contraseña
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isSubmitting || isLoading}
              required
              leftIcon={<Lock size={16} />}
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-3 text-sm font-semibold rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isSubmitting ? 'Verificando...' : 'Ingresar a Platform'}</span>
            <ArrowRight size={16} />
          </Button>
        </form>

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-border-subtle">
          <p className="text-[11px] text-text-tertiary">
            SevenPOS Operator Platform &bull; Acceso estrictamente restringido
          </p>
        </div>

      </div>
    </div>
  );
};
