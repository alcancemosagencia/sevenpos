import React, { useState, useEffect, useRef } from 'react';
import { Mail, CheckCircle2, RotateCw, AlertCircle, ArrowLeft, Edit3, Check, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { OtpInput } from '../../components/ui/OtpInput';
import { EMAIL_CONFIG } from '../../domain/email/EmailConfig';
import sevenposLogo from '../../assets/branding/sevenpos-logo-horizontal.png';

const RESEND_COOLDOWN_SECONDS = EMAIL_CONFIG.TRANSACTIONAL.RESEND_COOLDOWN_SECONDS;
const OTP_LENGTH = EMAIL_CONFIG.TRANSACTIONAL.DEFAULT_OTP_LENGTH;

interface VerifyEmailPageProps {
  email: string;
  onVerifyOtp?: (otp: string) => Promise<{ success: boolean; error?: string } | boolean>;
  onCheckVerification?: () => Promise<boolean>;
  onResendEmail: () => Promise<void>;
  onUpdateEmail?: (newEmail: string) => Promise<{ success: boolean; error?: string } | void>;
  onBackToLogin: () => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({
  email,
  onVerifyOtp,
  onCheckVerification,
  onResendEmail,
  onUpdateEmail,
  onBackToLogin,
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
    if (code.length < OTP_LENGTH || !onVerifyOtp) return;

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
        err instanceof Error ? err.message : 'Error al comprobar el código de verificación.'
      );
    } finally {
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
      setErrorMessage(err instanceof Error ? err.message : 'Error al comprobar verificación.');
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
      setSuccessMessage('¡Nuevo código de verificación enviado!');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al reenviar el código.');
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
      setErrorMessage(err instanceof Error ? err.message : 'Error al actualizar el correo.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-surface border border-border-default rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-center">
        {/* Brand Logo */}
        <div className="flex justify-center">
          <img src={sevenposLogo} alt="SevenPOS" className="h-7 w-auto object-contain" />
        </div>

        {/* Mail Icon */}
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center mx-auto">
          <Mail size={32} />
        </div>

        {/* Heading & Email info */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Verifica tu cuenta
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Te enviamos un código de {OTP_LENGTH} dígitos a:
          </p>

          {!isEditingEmail ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-bold text-text-primary bg-surface-secondary py-1.5 px-3 rounded-xl border border-border-default break-all">
                {email}
              </span>
              {onUpdateEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setEditedEmail(email);
                    setIsEditingEmail(true);
                  }}
                  title="Corregir correo"
                  className="p-1.5 text-text-secondary hover:text-brand-primary transition-colors rounded-lg hover:bg-surface-secondary"
                >
                  <Edit3 size={15} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 max-w-sm mx-auto">
              <input
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                placeholder="nuevo@correo.com"
                className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-surface-secondary border border-border-default text-text-primary focus:border-brand-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveEditedEmail}
                disabled={isUpdatingEmail}
                className="p-2 bg-brand-primary text-text-inverse rounded-xl hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditedEmail(email);
                  setIsEditingEmail(false);
                }}
                className="p-2 bg-surface-secondary text-text-secondary rounded-xl hover:text-text-primary transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Error / Success Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-center gap-2.5 text-left">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success text-xs flex items-center gap-2.5 text-left">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* OTP Input Section */}
        {onVerifyOtp && (
          <div className="space-y-4 pt-1">
            <OtpInput
              length={OTP_LENGTH}
              value={otp}
              onChange={setOtp}
              onComplete={(completedOtp) => handleVerifyOtp(completedOtp)}
              hasError={Boolean(errorMessage)}
              disabled={isVerifying}
            />

            <Button
              variant="brand"
              size="lg"
              onClick={() => handleVerifyOtp()}
              isLoading={isVerifying}
              disabled={otp.length < OTP_LENGTH}
              leftIcon={<CheckCircle2 size={16} />}
              className="w-full font-bold"
            >
              Verificar código
            </Button>
          </div>
        )}

        {/* Fallback Check Link / Resend */}
        <div className="space-y-3 pt-2">
          {onCheckVerification && (
            <button
              type="button"
              onClick={handleCheckLink}
              disabled={isChecking}
              className="text-xs text-brand-primary hover:underline font-medium block mx-auto disabled:opacity-50"
            >
              {isChecking ? 'Comprobando enlace...' : '¿Hiciste clic en el enlace del correo? Compruébalo aquí'}
            </button>
          )}

          <Button
            variant="secondary"
            size="md"
            onClick={handleResend}
            isLoading={isResending}
            disabled={cooldown > 0 || isResending}
            leftIcon={<RotateCw size={15} className={isResending ? 'animate-spin' : ''} />}
            className="w-full"
          >
            {cooldown > 0
              ? `Reenviar código (${cooldown}s)`
              : 'Reenviar código de verificación'}
          </Button>
        </div>

        {/* Back to Login */}
        <div className="pt-4 border-t border-border-default">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center justify-center gap-1.5 mx-auto transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Volver a iniciar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
