import React, { useState, useEffect, useRef } from 'react';
import { OtpInput } from '../../components/ui/OtpInput';
import { EMAIL_CONFIG } from '../../domain/email/EmailConfig';
import { AuthLayout } from './AuthLayout';
import { AuthButton, AuthField, AuthFeedback } from './AuthControls';
import { AMBIGUOUS_SIGNUP_MESSAGE, authMessage } from '../../application/auth/authMessages';

const RESEND_COOLDOWN_SECONDS = EMAIL_CONFIG.TRANSACTIONAL.RESEND_COOLDOWN_SECONDS;
const OTP_LENGTH = EMAIL_CONFIG.TRANSACTIONAL.DEFAULT_OTP_LENGTH;

interface VerifyEmailPageProps {
  email: string;
  onVerifyOtp?: (otp: string) => Promise<{ success: boolean; error?: string } | boolean>;
  onCheckVerification?: () => Promise<boolean>;
  onResendEmail: () => Promise<void>;
  onUpdateEmail?: (newEmail: string) => Promise<{ success: boolean; error?: string } | void>;
  onBackToLogin: () => void;
  onChangeEmail?: () => void;
  onForgotPassword?: () => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({
  email,
  onVerifyOtp,
  onCheckVerification,
  onResendEmail,
  onUpdateEmail,
  onBackToLogin,
  onChangeEmail, onForgotPassword,
}) => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cooldown timer
  const [cooldown, setCooldown] = useState<number>(RESEND_COOLDOWN_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const verificationPending = useRef(false);

  // Edit email modal / inline state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState(email);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otp;
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code) || !onVerifyOtp || verificationPending.current) return;
    verificationPending.current = true;

    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await onVerifyOtp(code);
      if (typeof result === 'boolean') {
        if (!result) {
          setErrorMessage('Código incorrecto. Revisa los números e inténtalo nuevamente.');
        }
      } else if (!result.success) {
        setErrorMessage(result.error || 'Código incorrecto. Revisa los números e inténtalo nuevamente.');
      }
    } catch (err: unknown) {
      setErrorMessage(
        authMessage(err, 'Error al comprobar el código de verificación.')
      );
    } finally {
      verificationPending.current = false;
      setIsVerifying(false);
    }
  };

  const handleCheckLink = async () => {
    if (!onCheckVerification) return;
    setIsChecking(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const isVerified = await onCheckVerification();
      if (!isVerified) {
        setErrorMessage(
          `Tu correo aún no figura como verificado. Ingresa el código de ${OTP_LENGTH} dígitos que te enviamos o abre el enlace del correo.`
        );
      }
    } catch (err: unknown) {
      setErrorMessage(authMessage(err, 'Error al comprobar verificación.'));
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await onResendEmail();
      setSuccessMessage('Solicitud de reenvío aceptada. Revisa tu correo y la carpeta de spam.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      setErrorMessage(authMessage(err, 'Error al reenviar el código.'));
    } finally {
      setIsResending(false);
    }
  };

  const handleSaveEditedEmail = async () => {
    if (!onUpdateEmail) {
      setIsEditingEmail(false);
      return;
    }
    const clean = editedEmail.trim();
    if (!clean || !clean.includes('@')) {
      setErrorMessage('Por favor ingresa un correo electrónico válido.');
      return;
    }
    setIsUpdatingEmail(true);
    setErrorMessage(null);
    try {
      await onUpdateEmail(clean);
      setIsEditingEmail(false);
      setSuccessMessage(`Correo actualizado a ${clean}. Hemos enviado un nuevo código.`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setOtp('');
    } catch (err: unknown) {
      setErrorMessage(authMessage(err, 'Error al actualizar el correo.'));
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return <AuthLayout illustration="owner">
    <h1>Verifica tu cuenta</h1>
    <p className="auth-description">Revisa el correo <strong>{email}</strong>. Si recibiste un código de {OTP_LENGTH} dígitos, ingrésalo para continuar.</p>
    {errorMessage && <AuthFeedback>{errorMessage}</AuthFeedback>}
    {successMessage && <AuthFeedback success>{successMessage}</AuthFeedback>}
    {isEditingEmail ? <form className="auth-form" onSubmit={event => {event.preventDefault();void handleSaveEditedEmail();}}>
      <AuthField label="Correo electrónico" type="email" value={editedEmail} onChange={setEditedEmail} autoComplete="email" required />
      <AuthButton type="submit" busy={isUpdatingEmail}>Guardar correo</AuthButton>
      <button type="button" className="auth-link" onClick={() => setIsEditingEmail(false)}>Cancelar</button>
    </form> : <>
      {onVerifyOtp && <><div className="auth-otp"><OtpInput length={OTP_LENGTH} value={otp} onChange={setOtp} onComplete={completed => handleVerifyOtp(completed)} hasError={Boolean(errorMessage)} disabled={isVerifying} /></div><AuthButton onPress={() => void handleVerifyOtp()} busy={isVerifying} isDisabled={otp.length < OTP_LENGTH}>{isVerifying ? 'Verificando…' : 'Verificar código'}</AuthButton></>}
      <div className="auth-footer">
        <AuthButton secondary onPress={() => void handleResend()} busy={isResending} isDisabled={cooldown > 0}>{cooldown > 0 ? 'Reenviar código ('+cooldown+'s)' : 'Reenviar código de verificación'}</AuthButton>
        <div className="auth-inline-actions">{onCheckVerification && <button type="button" className="auth-link" disabled={isChecking} onClick={handleCheckLink}>{isChecking ? 'Comprobando enlace…' : 'Ya abrí el enlace del correo'}</button>}
        {(onUpdateEmail || onChangeEmail) && <button type="button" className="auth-link" onClick={() => {if(onUpdateEmail){setEditedEmail(email);setIsEditingEmail(true);}else{onChangeEmail?.();}}}>Cambiar correo</button>}</div>
        <p>{AMBIGUOUS_SIGNUP_MESSAGE}</p>
        <div className="auth-inline-actions"><button type="button" className="auth-link" onClick={onBackToLogin}>Iniciar sesión</button>{onForgotPassword && <button type="button" className="auth-link" onClick={onForgotPassword}>Recuperar contraseña</button>}</div>
      </div>
    </>}
  </AuthLayout>;
};
