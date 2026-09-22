import React, { useState } from 'react';
import {
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  LogOut,
  Sparkles,
  Lock,
  UserCheck,
  Check,
  RefreshCw,
} from 'lucide-react';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { platformAdminService } from '../services/PlatformAdminService';
import { getSupabaseClient } from '../../infrastructure/cloud/supabaseClient';

export const PlatformSettingsPage: React.FC = () => {
  const { admin, signOut } = usePlatformAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Form submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);

  // Live password validation rules
  const hasMinLength = newPassword.length >= 12;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setErrorMessage('Ingresa tu contraseña actual.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('La nueva contraseña no cumple con los requisitos de seguridad.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await platformAdminService.changePassword({
        currentPassword,
        newPassword,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'No pudimos actualizar la contraseña. Inténtalo nuevamente.');
      } else {
        setSuccessMessage('Contraseña actualizada correctamente.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No pudimos actualizar la contraseña. Inténtalo nuevamente.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOutAll = async () => {
    setIsSigningOutAll(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut({ scope: 'global' });
      await signOut();
    } catch (err) {
      console.error('[PlatformSettingsPage] Error signing out all sessions:', err);
      await signOut();
    } finally {
      setIsSigningOutAll(false);
    }
  };

  if (!admin) {
    return null;
  }

  return (
    <div className="space-y-6 font-sans max-w-6xl mx-auto">
      
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Configuración
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary">
          Cuenta y seguridad de SevenPOS Platform.
        </p>
      </div>

      {/* Top Grid: Cuenta (2 cols) & Sesiones (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECCIÓN 1: CUENTA (Definition list) */}
        <section className="lg:col-span-2 bg-surface border border-border-default rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-3.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <UserCheck size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-text-primary">Cuenta Super Admin</h2>
              <p className="text-xs text-text-secondary">Información del operador autenticado en la plataforma.</p>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
            <div className="space-y-1 pb-3 border-b sm:border-b-0 border-border-subtle">
              <dt className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Correo Electrónico</dt>
              <dd className="font-semibold text-text-primary text-sm truncate" title={admin.email}>
                {admin.email}
              </dd>
            </div>

            <div className="space-y-1 pb-3 border-b sm:border-b-0 border-border-subtle">
              <dt className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Rol de Acceso</dt>
              <dd className="flex items-center gap-1.5 pt-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  <Shield size={11} className="shrink-0" />
                  <span>{admin.role}</span>
                </span>
              </dd>
            </div>

            <div className="space-y-1 pt-1">
              <dt className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Estado de Cuenta</dt>
              <dd className="flex items-center gap-2 pt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Activo</span>
              </dd>
            </div>

            <div className="space-y-1 pt-1">
              <dt className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Último Acceso</dt>
              <dd className="font-medium text-text-primary pt-0.5">
                {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString('es-CL') : 'Sesión actual'}
              </dd>
            </div>
          </dl>
        </section>

        {/* SECCIÓN 2: SESIONES */}
        <section className="lg:col-span-1 bg-surface border border-border-default rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center gap-3 border-b border-border-subtle pb-3.5">
              <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <Shield size={18} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-text-primary">Sesiones</h2>
                <p className="text-xs text-text-secondary">Administra las sesiones activas de tu cuenta Platform.</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-text-primary font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Sesión actual: Activa</span>
              </div>
              <p className="text-[11px] text-text-tertiary">
                Dispositivo y navegador actual autenticado.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-border-default rounded-xl transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>Cerrar sesión</span>
            </button>

            <button
              type="button"
              onClick={handleSignOutAll}
              disabled={isSigningOutAll}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-error hover:bg-error/10 border border-error/20 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{isSigningOutAll ? 'Cerrando sesiones...' : 'Cerrar todas las sesiones'}</span>
            </button>
          </div>
        </section>

      </div>

      {/* SECCIÓN 3: CAMBIAR CONTRASEÑA (Full width prominent card) */}
      <section className="bg-surface border border-border-default rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-border-subtle pb-3.5">
          <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <KeyRound size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-text-primary">Cambiar contraseña</h2>
            <p className="text-xs text-text-secondary">Mantén tu acceso a SevenPOS Platform protegido con una contraseña única.</p>
          </div>
        </div>

        {/* Security Recommendation Callout (Clean & Subtle) */}
        <div className="px-3.5 py-2.5 bg-surface-secondary border border-border-subtle rounded-xl flex items-center gap-2.5 text-xs text-text-secondary">
          <Sparkles size={15} className="text-brand-primary shrink-0" />
          <span>
            <strong className="font-semibold text-text-primary">Recomendación:</strong> Usa una contraseña exclusiva para Platform, diferente de tus credenciales personales o de pruebas.
          </span>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
            <XCircle size={15} className="shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitPasswordChange} className="space-y-5">
          
          {/* Current Password - Full width */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <Lock size={13} />
              <span>Contraseña actual</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="Ingresa tu contraseña actual"
                className="w-full bg-surface-secondary text-text-primary placeholder:text-text-tertiary border border-border-default rounded-xl text-xs sm:text-sm px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 p-1 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                title={showCurrent ? 'Ocultar' : 'Mostrar'}
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New Password & Confirmation - 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <KeyRound size={13} />
                <span>Nueva contraseña</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Mínimo 12 caracteres"
                  className="w-full bg-surface-secondary text-text-primary placeholder:text-text-tertiary border border-border-default rounded-xl text-xs sm:text-sm px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 p-1 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                  title={showNew ? 'Ocultar' : 'Mostrar'}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <KeyRound size={13} />
                <span>Confirmar nueva contraseña</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Repite la nueva contraseña"
                  className="w-full bg-surface-secondary text-text-primary placeholder:text-text-tertiary border border-border-default rounded-xl text-xs sm:text-sm px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 p-1 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                  title={showConfirm ? 'Ocultar' : 'Mostrar'}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

          </div>

          {/* Live Visual Password Rules Checklist (Compact inline) */}
          <div className="p-3.5 bg-surface-secondary/60 border border-border-subtle rounded-xl space-y-2">
            <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
              Requisitos de seguridad
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-text-tertiary'}`}>
                {hasMinLength ? <Check size={13} className="shrink-0 text-emerald-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-border-default shrink-0 ml-0.5 mr-1" />}
                <span>12 caracteres o más</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-text-tertiary'}`}>
                {hasUppercase ? <Check size={13} className="shrink-0 text-emerald-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-border-default shrink-0 ml-0.5 mr-1" />}
                <span>Una mayúscula</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-text-tertiary'}`}>
                {hasLowercase ? <Check size={13} className="shrink-0 text-emerald-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-border-default shrink-0 ml-0.5 mr-1" />}
                <span>Una minúscula</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-text-tertiary'}`}>
                {hasNumber ? <Check size={13} className="shrink-0 text-emerald-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-border-default shrink-0 ml-0.5 mr-1" />}
                <span>Un número</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-text-tertiary'}`}>
                {hasSpecial ? <Check size={13} className="shrink-0 text-emerald-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-border-default shrink-0 ml-0.5 mr-1" />}
                <span>Un carácter especial</span>
              </div>
              {confirmPassword.length > 0 && (
                <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-error font-medium'}`}>
                  {passwordsMatch ? <Check size={13} className="shrink-0 text-emerald-500" /> : <XCircle size={13} className="shrink-0 text-error" />}
                  <span>{passwordsMatch ? 'Contraseñas coinciden' : 'No coinciden'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !isPasswordValid || !passwordsMatch || !currentPassword}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-surface-secondary disabled:text-text-tertiary disabled:border disabled:border-border-default text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Actualizando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Actualizar contraseña</span>
                </>
              )}
            </button>
          </div>

        </form>
      </section>

    </div>
  );
};