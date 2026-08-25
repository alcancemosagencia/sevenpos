import React from 'react';
import { ArrowRight, ArrowLeft, DollarSign, Coins, Info } from 'lucide-react';
import { SupportedCountryCode } from '../../../types/country';
import { RegionalSettings } from '../../../types/onboarding';
import { COUNTRY_PROFILES } from '../../../config/countries';
import { Switch } from '../../../components/ui/Switch';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

export interface RegionalStepProps {
  countryCode: SupportedCountryCode;
  settings: RegionalSettings;
  onUpdate: (settings: Partial<RegionalSettings>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const RegionalStep: React.FC<RegionalStepProps> = ({
  countryCode,
  settings,
  onUpdate,
  onNext,
  onBack,
}) => {
  const profile = COUNTRY_PROFILES[countryCode];
  const isVenezuela = countryCode === 'VE';

  return (
    <div className="space-y-4">
      {/* Primary Currency Card */}
      <div className="p-4 rounded-[var(--radius-card)] bg-surface border border-border-default shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-[var(--radius-button)] bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
            <Coins size={20} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Moneda principal de operación
            </span>
            <h4 className="text-sm sm:text-base font-bold text-text-primary truncate">
              {profile.primaryCurrency.name} ({profile.primaryCurrency.code})
            </h4>
          </div>
        </div>

        <Badge variant="brand" size="md" className="font-mono font-bold">
          {profile.primaryCurrency.symbol}
        </Badge>
      </div>

      {/* Explanatory text for CL and CO */}
      {!isVenezuela && (
        <div className="p-3.5 rounded-[var(--radius-button)] bg-surface-secondary/50 border border-border-subtle text-xs text-text-secondary leading-relaxed flex items-start gap-2.5">
          <Info size={16} className="text-text-tertiary shrink-0 mt-0.5" />
          <p>
            SevenPOS configurará inicialmente el negocio para operar exclusivamente en{' '}
            <strong className="text-text-primary font-semibold">{profile.primaryCurrency.name.toLowerCase()}</strong>.
          </p>
        </div>
      )}

      {/* Venezuela Multi-currency (VES + USD) */}
      {isVenezuela && (
        <div className="space-y-3 pt-1">
          <div className="p-4 rounded-[var(--radius-card)] bg-surface border border-border-default shadow-xs space-y-3">
            <Switch
              checked={settings.enableSecondaryUSD}
              onChange={(checked) =>
                onUpdate({
                  enableSecondaryUSD: checked,
                  exchangeRateProvider: checked ? 'BCV' : undefined,
                })
              }
              label="Operar también en dólares estadounidenses (USD)"
              description="Podrás mostrar precios y registrar operaciones utilizando VES y USD."
            />

            {/* BCV info surface */}
            {settings.enableSecondaryUSD && (
              <div className="pt-3 border-t border-border-subtle animate-in fade-in-0 duration-150 space-y-2">
                <div className="flex items-start gap-2 text-xs text-text-secondary">
                  <DollarSign size={15} className="text-brand-primary shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-text-primary font-semibold">Tasa de cambio:</strong> SevenPOS podrá utilizar posteriormente la tasa oficial del BCV o tasa manual personalizada.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="neutral" size="sm">
                    Proveedor futuro: BCV
                  </Badge>
                  <span className="text-[11px] text-text-tertiary">
                    (Configurable en ajustes de caja)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="pt-4 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="md"
          leftIcon={<ArrowLeft size={16} />}
          onClick={onBack}
        >
          Atrás
        </Button>

        <Button
          type="button"
          variant="brand"
          size="md"
          rightIcon={<ArrowRight size={16} />}
          onClick={onNext}
          className="px-6 font-semibold"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};
