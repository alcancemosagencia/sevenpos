import React, { useState } from 'react';
import { Mail, CheckCircle2, RotateCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import sevenposLogo from '../../assets/branding/sevenpos-logo-horizontal.png';

interface VerifyEmailPageProps {
  email: string;
  onCheckVerification: () => Promise<boolean>;
  onResendEmail: () => Promise<void>;
  onBackToLogin: () => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({
  email,
  onCheckVerification,
  onResendEmail,
  onBackToLogin,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
      const isVerified = await onCheckVerification();
      if (!isVerified) {
        setErrorMessage(
          'Tu correo aún no figura como verificado. Por favor abre el enlace que enviamos a tu bandeja de entrada o haz clic en reenviar.'
        );
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al comprobar verificación.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setErrorMessage(null);
    setResendSuccess(false);
    try {
      await onResendEmail();
      setResendSuccess(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al reenviar correo.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-surface border border-border-default rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <img src={sevenposLogo} alt="SevenPOS" className="h-7 w-auto object-contain" />
        </div>

        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center mx-auto">
          <Mail size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Revisa tu correo electrónico
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Enviamos un enlace de confirmación a:
          </p>
          <p className="text-sm font-bold text-text-primary bg-surface-secondary py-1.5 px-3 rounded-xl border border-border-default break-all">
            {email}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-center gap-2.5 text-left">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {resendSuccess && (
          <div className="p-3.5 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success text-xs flex items-center gap-2.5 text-left">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>¡Correo de verificación reenviado exitosamente!</span>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <Button
            variant="brand"
            size="lg"
            onClick={handleCheck}
            isLoading={isChecking}
            leftIcon={<CheckCircle2 size={16} />}
            className="w-full font-bold"
          >
            Ya verifiqué mi correo
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={handleResend}
            isLoading={isResending}
            leftIcon={<RotateCw size={15} />}
            className="w-full"
          >
            Reenviar correo de verificación
          </Button>
        </div>

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
