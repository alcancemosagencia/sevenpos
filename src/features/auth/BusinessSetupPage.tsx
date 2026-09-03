import React, { useState } from 'react';
import { Store, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import sevenposLogo from '../../assets/branding/sevenpos-logo-horizontal.png';

interface BusinessSetupPageProps {
  userEmail: string;
  defaultBusinessName?: string;
  defaultCountryCode?: string;
  onSetupBusiness: (params: { businessName: string; countryCode: string }) => Promise<{ success: boolean; error?: string }>;
  onSignOut: () => Promise<void>;
}

export const BusinessSetupPage: React.FC<BusinessSetupPageProps> = ({
  userEmail,
  defaultBusinessName = '',
  defaultCountryCode = 'CL',
  onSetupBusiness,
  onSignOut,
}) => {
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!businessName.trim()) {
      setErrorMessage('Ingresa el nombre de tu negocio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSetupBusiness({
        businessName: businessName.trim(),
        countryCode,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Error al configurar negocio.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al inicializar negocio.');
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
      <div className="w-full max-w-lg bg-surface border border-border-default rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <img src={sevenposLogo} alt="SevenPOS" className="h-7 w-auto object-contain" />
          <span className="text-[11px] font-semibold text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full">
            Paso 1 de 2
          </span>
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold">
            <Sparkles size={13} />
            <span>Configurar Negocio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Crea tu Negocio Cloud
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Tu cuenta <strong className="text-text-primary">{userEmail}</strong> está autenticada. Ingresa el nombre de tu negocio para comenzar.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Nombre de tu negocio o tienda *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-tertiary">
                <Store size={16} />
              </div>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej. Minimarket Don Pepe"
                className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              País de operación *
            </label>
            <Select
              options={countryOptions}
              value={countryCode}
              onChange={setCountryCode}
            />
          </div>

          <Button
            type="submit"
            variant="brand"
            size="lg"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight size={16} />}
            className="w-full mt-2 font-bold"
          >
            Continuar a enrolar dispositivo
          </Button>
        </form>

        <div className="pt-4 border-t border-border-default text-center">
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
  );
};
