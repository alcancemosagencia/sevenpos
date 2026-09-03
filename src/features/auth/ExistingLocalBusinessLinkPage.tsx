import React, { useState } from 'react';
import { Store, ShieldCheck, ArrowRight, AlertCircle, Globe, Mail } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import sevenposLogo from '../../assets/branding/sevenpos-logo-horizontal.png';

interface ExistingLocalBusinessLinkPageProps {
  userEmail: string;
  localBusinessName: string;
  localCountryCode: string;
  onLinkBusiness: () => Promise<{ success: boolean; error?: string }>;
  onSignOut: () => Promise<void>;
}

export const ExistingLocalBusinessLinkPage: React.FC<ExistingLocalBusinessLinkPageProps> = ({
  userEmail,
  localBusinessName,
  localCountryCode,
  onLinkBusiness,
  onSignOut,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLink = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await onLinkBusiness();
      if (!res.success) {
        setErrorMessage(res.error || 'Error al vincular negocio local.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al vincular negocio local.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg bg-surface border border-border-default rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <img src={sevenposLogo} alt="SevenPOS" className="h-7 w-auto object-contain" />
          <span className="text-[11px] font-semibold text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full">
            Vinculación Oficial
          </span>
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold">
            <ShieldCheck size={13} />
            <span>Negocio Local Detectado</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Vincular tu negocio actual
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Hemos detectado los datos de tu negocio en esta PC. Vincúlalo a tu cuenta SevenPOS para habilitar sincronización cloud y acceso multi-dispositivo sin perder tu información local ni tu PIN.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Local Business Summary Card */}
        <div className="p-4 bg-surface-secondary border border-border-default rounded-2xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
              <Store size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                Negocio local
              </p>
              <p className="text-base font-bold text-text-primary truncate">
                {localBusinessName || 'Mi Negocio'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-default/60 text-xs">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Globe size={14} className="text-text-tertiary shrink-0" />
              <span>País: <strong className="text-text-primary">{localCountryCode}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-text-secondary min-w-0">
              <Mail size={14} className="text-text-tertiary shrink-0" />
              <span className="truncate">Cuenta: <strong className="text-text-primary truncate">{userEmail}</strong></span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="brand"
            size="lg"
            isLoading={isSubmitting}
            onClick={handleLink}
            rightIcon={<ArrowRight size={16} />}
            className="w-full font-bold"
          >
            Vincular este negocio
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onSignOut}
              className="text-xs text-text-secondary hover:text-text-primary underline"
            >
              Cerrar sesión / Iniciar con otra cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
