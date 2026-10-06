import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { AuthButton, AuthField, AuthFeedback } from './AuthControls';
import { authMessage } from '../../application/auth/authMessages';

interface AccountLoginPageProps {
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onGoToRegister: () => void;
  onForgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  onBack?: () => void;
  initialRecovery?: boolean;
}

export const AccountLoginPage: React.FC<AccountLoginPageProps> = ({
  onLogin,
  onGoToRegister,
  onForgotPassword,
  onBack,
  initialRecovery = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return initialRecovery || window.location.pathname.includes('reset-password');
    }
    return initialRecovery;
  });

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
        setErrorMessage(authMessage(err, 'Error de conexión.'));
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
      setErrorMessage(authMessage(err, 'Error de conexión al autenticar.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMode = (recovery: boolean) => { setIsResetMode(recovery);setErrorMessage(null);setResetSuccessMessage(null);setPassword(''); };
  return <AuthLayout illustration={isResetMode ? 'security' : 'business'}>
    <h1>{isResetMode ? 'Recupera tu acceso' : 'Bienvenido de nuevo'}</h1>
    <p className="auth-description">{isResetMode ? 'Te enviaremos un enlace seguro para restablecer tu contraseña.' : 'Inicia sesión y sigue haciendo crecer tu negocio.'}</p>
    {errorMessage && <AuthFeedback>{errorMessage}</AuthFeedback>}
    {resetSuccessMessage && <AuthFeedback success>{resetSuccessMessage}</AuthFeedback>}
    <form className="auth-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <AuthField id="login-email" label="Correo electrónico" type="email" value={email} onChange={setEmail} autoComplete="email" required />
      {!isResetMode && <><AuthField id="login-password" label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete="current-password" required /><button type="button" className="auth-link" onClick={() => changeMode(true)}>¿Olvidaste tu contraseña?</button></>}
      <AuthButton type="submit" busy={isSubmitting}>{isSubmitting ? (isResetMode ? 'Enviando enlace…' : 'Iniciando sesión…') : (isResetMode ? 'Enviar enlace de recuperación' : 'Iniciar sesión')}</AuthButton>
    </form>
    <div className="auth-footer">
      {isResetMode ? <button type="button" className="auth-link" onClick={() => changeMode(false)}>Volver a inicio de sesión</button> : <p>¿No tienes una cuenta? <button type="button" className="auth-link" onClick={onGoToRegister}>Regístrate aquí</button></p>}
      {onBack && <button type="button" data-testid="login-back-btn" className="auth-link" onClick={onBack}>Volver</button>}
    </div>
  </AuthLayout>;
};
