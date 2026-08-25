import React from 'react';
import { ArrowRight, CheckCircle2, Building, Globe, User, Lock, AlertCircle } from 'lucide-react';
import { OnboardingState } from '../../../types/onboarding';
import { COUNTRY_PROFILES } from '../../../config/countries';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { CountryFlag } from '../components/CountryFlag';

export interface ConfirmationStepProps {
  state: OnboardingState;
  onFinish: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  state,
  onFinish,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const profile = COUNTRY_PROFILES[state.countryCode];

  return (
    <div className="space-y-5">
      {/* Error Alert if action fails */}
      {error && (
        <div className="p-3.5 rounded-[var(--radius-button)] bg-rose-500/10 border border-rose-500/20 flex items-start justify-between gap-3 text-rose-500 animate-in fade-in-0">
          <div className="flex items-start gap-3 min-w-0">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-text-primary">
                No pudimos finalizar la configuración
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                {error}
              </p>
            </div>
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="shrink-0 text-xs"
            >
              Reintentar
            </Button>
          )}
        </div>
      )}

      {/* Success Badge */}
      <div className="p-3.5 rounded-[var(--radius-button)] bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-500">
        <CheckCircle2 size={22} className="shrink-0" />
        <div className="min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-text-primary">
            Configuración inicial completada
          </h4>
          <p className="text-xs text-text-secondary">
            Su negocio y credenciales han sido preparadas con éxito.
          </p>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Negocio */}
        <div className="p-3 rounded-[var(--radius-card)] bg-surface-secondary/50 border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Building size={14} />
            <span>Negocio</span>
          </div>
          <p className="text-sm font-bold text-text-primary truncate">
            {state.business.name || 'Mi Negocio'}
          </p>
          {state.business.fiscalId && (
            <p className="text-xs text-text-secondary font-mono truncate">
              ID: {state.business.fiscalId}
            </p>
          )}
        </div>

        {/* País y Moneda */}
        <div className="p-3 rounded-[var(--radius-card)] bg-surface-secondary/50 border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Globe size={14} />
            <span>País y Moneda</span>
          </div>
          <div className="flex items-center gap-2">
            <CountryFlag countryCode={state.countryCode} size="sm" />
            <p className="text-sm font-bold text-text-primary truncate">
              {profile.countryName}
            </p>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            <Badge variant="neutral" size="sm">
              {profile.primaryCurrency.code}
            </Badge>
            {state.regionalSettings.enableSecondaryUSD && (
              <Badge variant="brand" size="sm">
                + USD
              </Badge>
            )}
          </div>
        </div>

        {/* Propietario */}
        <div className="p-3 rounded-[var(--radius-card)] bg-surface-secondary/50 border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <User size={14} />
            <span>Usuario Administrador</span>
          </div>
          <p className="text-sm font-bold text-text-primary truncate">
            {state.owner.firstName} {state.owner.lastName || ''}
          </p>
          <Badge variant="brand" size="sm">
            {state.owner.role}
          </Badge>
        </div>

        {/* PIN de Seguridad */}
        <div className="p-3 rounded-[var(--radius-card)] bg-surface-secondary/50 border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Lock size={14} />
            <span>Seguridad de Acceso</span>
          </div>
          <p className="text-sm font-bold text-text-primary">
            PIN de 4 dígitos
          </p>
          <p className="text-xs text-emerald-500 font-medium">
            ✓ Configurado y verificado
          </p>
        </div>
      </div>

      {/* Info notice about PIN Login */}
      <div className="p-3 rounded-[var(--radius-button)] bg-surface border border-border-subtle text-xs text-text-secondary">
        <p>
          Al presionar <strong>Entrar a SevenPOS</strong>, accederá a la pantalla de desbloqueo para iniciar su primera sesión con su PIN.
        </p>
      </div>

      {/* CTA Button */}
      <div className="pt-2 flex justify-end">
        <Button
          variant="brand"
          size="lg"
          rightIcon={<ArrowRight size={18} />}
          isLoading={isLoading}
          disabled={isLoading}
          onClick={onFinish}
          className="w-full sm:w-auto px-8 font-bold shadow-md"
        >
          Entrar a SevenPOS
        </Button>
      </div>
    </div>
  );
};
